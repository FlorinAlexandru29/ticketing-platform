// src/lib/auth-options.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { JWT } from "next-auth/jwt";
import { verifyPassword } from "@/lib/password";

const appBaseUrl =
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Optional: import birthdate from providers on first sign-in (requires extra scopes) */
async function tryUpsertBirthdateFromProvider(params: {
  provider: string;
  accessToken?: string | null;
  userId: string;
}) {
  const { provider, accessToken, userId } = params;
  if (!accessToken) return;

  try {
    const cur = await prisma.user.findUnique({ where: { id: userId }, select: { birthdate: true } });
    if (cur?.birthdate) return;

    let iso: string | null = null;

    if (provider === "google") {
      // Needs scope: https://www.googleapis.com/auth/user.birthday.read and People API enabled
      const res = await fetch("https://people.googleapis.com/v1/people/me?personFields=birthdays", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: any = await res.json();
        const d = (data?.birthdays || []).find((b: any) => b?.date)?.date;
        if (d?.year && d?.month && d?.day) {
          const y = String(d.year).padStart(4, "0");
          const m = String(d.month).padStart(2, "0");
          const dd = String(d.day).padStart(2, "0");
          iso = `${y}-${m}-${dd}`;
        }
      }
    } else if (provider === "facebook") {
      // Needs 'user_birthday' permission (requires app review)
      const res = await fetch("https://graph.facebook.com/v19.0/me?fields=birthday", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: any = await res.json();
        const parts = String(data?.birthday || "").split("/");
        if (parts.length === 3) {
          const [mm, dd, yyyy] = parts;
          iso = `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }
      }
    }

    if (iso) {
      const [y, m, d] = iso.split("-").map(Number);
      const asDate = new Date(Date.UTC(y, m - 1, d));
      await prisma.user.update({ where: { id: userId }, data: { birthdate: asDate } });
    }
  } catch {
    // best effort
  }
}

/** Spotify token refresh helper */
async function refreshSpotifyAccessToken(token: JWT): Promise<JWT> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(token.refreshToken || ""),
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || "Spotify refresh failed");

  const expiresInMs = Number(data.expires_in ?? 3600) * 1000;

  return {
    ...token,
    accessToken: data.access_token as string,
    accessTokenExpires: Date.now() + expiresInMs,
    refreshToken: (data.refresh_token as string) || (token.refreshToken as string),
  };
}

/**
 * Merge “oldUserId” into “targetUserId” when a provider account (e.g. Spotify) is
 * already linked to a different user. The steps:
 * - Reassign domain data (tickets, hosted events)
 * - Move/cleanup HostProfile to avoid FK issues
 * - Delete the conflicting Account row so the unique constraint is clear
 * - Delete the old user (cascades sessions/accounts/credentials/etc.)
 */
async function mergeUsersOnLinkedAccount(params: {
  targetUserId: string;            // currently logged-in user (who is linking)
  provider: string;                // 'spotify'
  providerAccountId: string;       // spotify user id
}) {
  const { targetUserId, provider, providerAccountId } = params;

  // Is there an existing account for this provider identity?
  const existingAcc = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { userId: true },
  });
  if (!existingAcc) return; // nothing to merge
  const oldUserId = existingAcc.userId;
  if (oldUserId === targetUserId) return; // already linked to the same user

  await prisma.$transaction(async (tx) => {
    // Reassign domain data you care about
    await tx.ticket.updateMany({ where: { ownerId: oldUserId }, data: { ownerId: targetUserId } });
    await tx.event.updateMany({ where: { hostId: oldUserId }, data: { hostId: targetUserId } });

    // Host profile: move if target has none, else delete the old one
    const oldHP = await tx.hostProfile.findUnique({ where: { userId: oldUserId } });
    if (oldHP) {
      const newHP = await tx.hostProfile.findUnique({ where: { userId: targetUserId } });
      if (!newHP) {
        await tx.hostProfile.update({ where: { id: oldHP.id }, data: { userId: targetUserId } });
      } else {
        await tx.hostProfile.delete({ where: { id: oldHP.id } });
      }
    }

    // Remove the conflicting provider account row to clear the unique constraint
    await tx.account.delete({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });

    // Finally, delete the old user. (Sessions/accounts/credentials cascade.)
    await tx.user.delete({ where: { id: oldUserId } });
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Optional: include people API scope to auto-import birthday
      authorization: { params: { scope: "openid email profile https://www.googleapis.com/auth/user.birthday.read" } },
      allowDangerousEmailAccountLinking: true,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      // Optional: include user_birthday permission
      authorization: { params: { scope: "email,public_profile,user_birthday" } },
      allowDangerousEmailAccountLinking: true,
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: { scope: "user-read-email" },
      },
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email", type: "text" },
        password:   { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const email = credentials.identifier.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { credential: true },
        });
        const hash = user?.credential?.passwordHash;
        if (!user || !hash) return null;

        const valid = await verifyPassword(credentials.password, hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // If the user is adding Spotify while already authenticated, merge if that Spotify is tied elsewhere
      if (account?.provider === "spotify" && account?.providerAccountId && user?.id) {
        try {
          await mergeUsersOnLinkedAccount({
            targetUserId: user.id, // in a linking flow, this is the currently signed-in user
            provider: account.provider,
            providerAccountId: String(account.providerAccountId),
          });
        } catch (e) {
          console.error("Merge on link failed:", e);
          // still proceed; worst case, linking fails due to unique constraint and NextAuth shows an error
        }
      }

      // Best-effort birthday import on first OAuth sign-in
      if (account && user?.id) {
        tryUpsertBirthdateFromProvider({
          provider: account.provider,
          accessToken: (account as any).access_token,
          userId: user.id,
        }).catch(() => {});
      }
      return true;
    },

    async redirect() {
      return appBaseUrl + "/";
    },

    async jwt({ token, account, user }) {
      // Initial sign-in
      if (account && user) {
        token.sub = user.id;
        if (user.image) (token as any).picture = user.image;

        if (account.provider === "spotify") {
          const expiresAtMs =
            (account.expires_at ? account.expires_at * 1000 : Date.now()) ||
            (account.expires_in ? Date.now() + Number(account.expires_in) * 1000 : Date.now() + 3600_000);
          (token as any).accessToken = account.access_token;
          (token as any).refreshToken = account.refresh_token;
          (token as any).accessTokenExpires = expiresAtMs;
        }
      }

      // Refresh Spotify if expired
      if ((token as any).accessToken && (token as any).accessTokenExpires && Date.now() >= (token as any).accessTokenExpires) {
        if ((token as any).refreshToken) {
          try {
            return await refreshSpotifyAccessToken(token);
          } catch {
            return { ...token, accessToken: undefined, accessTokenExpires: 0 };
          }
        }
      }

      // Always pull latest profile + flags from DB for the session
      if (token.sub) {
        const [dbUser, accounts] = await Promise.all([
          prisma.user.findUnique({
            where: { id: token.sub as string },
            select: {
              name: true,
              image: true,
              birthdate: true,
              countryCode: true, country: true, city: true,
              credential: { select: { id: true } },
            },
          }),
          prisma.account.findMany({
            where: { userId: token.sub as string },
            select: { provider: true },
          }),
        ]);

        if (dbUser?.image) (token as any).picture = dbUser.image;
        if (typeof dbUser?.name === "string") token.name = dbUser.name;

        (token as any).birthdate = dbUser?.birthdate
          ? new Date(dbUser.birthdate).toISOString().slice(0, 10)
          : null;

        (token as any).countryCode = dbUser?.countryCode ?? null;
        (token as any).country     = dbUser?.country ?? null;
        (token as any).city        = dbUser?.city ?? null;

        (token as any).hasCredentials = !!dbUser?.credential?.id;
        (token as any).oauthProviders = accounts.map(a => a.provider);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub as string;

        const pict = (token as any).picture as string | undefined;
        if (pict) session.user.image = pict;

        if (typeof token.name === "string") session.user.name = token.name;

        (session.user as any).birthdate = (token as any).birthdate ?? null;
        (session.user as any).hasCredentials = Boolean((token as any).hasCredentials);
        (session.user as any).oauthProviders = ((token as any).oauthProviders ?? []) as string[];
        (session.user as any).countryCode = (token as any).countryCode ?? null;
        (session.user as any).country     = (token as any).country ?? null;
        (session.user as any).city        = (token as any).city ?? null;
      }

      if ((token as any).accessToken) {
        (session as any).accessToken = (token as any).accessToken as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  pages: { error: "/auth/error", signIn: "/login" },
  debug: false,
  logger: {
    error(code, metadata) { console.error("NextAuth ERROR:", code, metadata); },
    warn(code) { console.warn("NextAuth WARN:", code); },
    debug(code, metadata) { console.log("NextAuth DEBUG:", code, metadata); },
  },
};
