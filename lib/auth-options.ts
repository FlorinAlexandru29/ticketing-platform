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

// ---- build a safe base URL once (dev + vercel) ----
const appBaseUrl =
  process.env.NEXTAUTH_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
    refreshToken: (data.refresh_token as string) || (token.refreshToken as string),
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: { params: { scope: "email,public_profile" } },
      allowDangerousEmailAccountLinking: true,
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: { scope: "user-read-email" },
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email", type: "text" }, // username removed from schema
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

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account }) {
      // Only gate credentials by email verification
      if (account?.provider === "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true, emailVerified: true },
        });

        if (dbUser && !dbUser.emailVerified && dbUser.email) {
          // Build an ABSOLUTE verify URL
          const url = new URL("/verify", appBaseUrl);
          url.searchParams.set("email", dbUser.email);
          return url.toString();
        }
      }
      return true;
    },

    // Always return an ABSOLUTE URL here as well
    async redirect() {
      return appBaseUrl + "/";
    },

    async jwt({ token, account, user }) {
      if (account && user) {
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

        return token;
      }

      if (token.accessToken && token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        if (token.refreshToken) {
          try {
            return await refreshSpotifyAccessToken(token);
          } catch {
            return { ...token, accessToken: undefined, accessTokenExpires: 0 };
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub as string;
      if ((token as any).accessToken) (session as any).accessToken = (token as any).accessToken as string;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // For NextAuth v5 you can also add: trustHost: true
  // (For v4, use AUTH_TRUST_HOST=true as an env var.)
  // trustHost: true,

  debug: true,
  pages: { error: "/auth/error", signIn: "/login" },
  logger: {
    error(code, metadata) { console.error("NextAuth ERROR:", code, metadata); },
    warn(code) { console.warn("NextAuth WARN:", code); },
    debug(code, metadata) { console.log("NextAuth DEBUG:", code, metadata); },
  },
};
