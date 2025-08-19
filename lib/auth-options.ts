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

// ---- Spotify token refresh helper ----
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
    // Spotify may omit refresh_token on refresh; keep the old one
    refreshToken: (data.refresh_token as string) || (token.refreshToken as string),
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // --- OAuth providers ---
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // enable if you expect same email across providers but differing verification
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: { params: { scope: 'email,public_profile' } },
      allowDangerousEmailAccountLinking: true, // enable if you expect same email across providers but differing verification
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: "user-read-email",
        },
      },
    }),

    // --- Credentials (email/username + password via Credential table) ---
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier.trim().toLowerCase();

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },                // email (lowercased)
              { username: credentials.identifier }, // username as typed (keep your chosen case policy)
            ],
          },
          include: { credential: true },
        });

        const hash = user?.credential?.passwordHash;
        if (!user || !hash) return null;

        const valid = await verifyPassword(credentials.password, hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name ?? user.username ?? undefined,
          email: user.email ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // Always send users to Home after auth flows (adjust if you want)
    async redirect({ baseUrl }) {
      return `${baseUrl}/`;
    },

    // Put tokens into the JWT; only track refresh for Spotify
    async jwt({ token, account, user }) {
      // Initial sign-in with any provider
      if (account && user) {
        // Keep user id on token
        token.sub = user.id;

        if (account.provider === "spotify") {
          const expiresAtMs =
            (account.expires_at ? account.expires_at * 1000 : Date.now()) ||
            (account.expires_in ? Date.now() + Number(account.expires_in) * 1000 : Date.now() + 3600_000);

          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: expiresAtMs,
          };
        }

        // For Google/Facebook we don't need to store/refresh provider tokens by default
        return token;
      }

      // Refresh Spotify token if present & expired
      if (token.accessToken && token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        if (token.refreshToken) {
          try {
            return await refreshSpotifyAccessToken(token);
          } catch {
            // Force re-auth by clearing token
            return { ...token, accessToken: undefined, accessTokenExpires: 0 };
          }
        }
      }

      return token;
    },

    // Expose user.id and accessToken on the session
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub as string;
      if (token.accessToken) (session as any).accessToken = token.accessToken as string;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Debugging (optional; remove in prod)
  debug: true,
  pages: { error: "/auth/error", signIn: "/login" },
  logger: {
    error(code, metadata) {
      console.error("NextAuth ERROR:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth WARN:", code);
    },
    debug(code, metadata) {
      console.log("NextAuth DEBUG:", code, metadata);
    },
  },
};
