// lib/auth-options.ts
import type { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { JWT } from "next-auth/jwt";

// (Optional) token refresh for Spotify — keeps accessToken valid
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
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: "user-read-email", // add more later (e.g., user-follow-read) if needed
        },
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // 1) ALWAYS send users to Home after auth flows
    async redirect({ baseUrl }) {
      return `${baseUrl}/`;
    },

    // 2) Put Spotify tokens into the JWT and keep them fresh
    async jwt({ token, account, user }) {
      // Initial sign-in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires:
            Number(Date.now()) + (account.expires_in ? Number(account.expires_in) * 1000 : 3600_000),
        };
      }

      // If we have a valid, unexpired token, use it
      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Otherwise, refresh it (if we have a refresh token)
      if (token.refreshToken) {
        try {
          return await refreshSpotifyAccessToken(token);
        } catch {
          // If refresh fails, force re-auth by clearing access token
          return { ...token, accessToken: undefined, accessTokenExpires: 0 };
        }
      }

      return token;
    },

    // 3) Expose user.id and accessToken on the session for your components
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub as string;
      if (token.accessToken) (session as any).accessToken = token.accessToken as string;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // TEMP: easier debugging
  debug: true,
  pages: { error: "/auth/error" },
    logger: {
    error(code, metadata) {
      // shows the exact error + details in Vercel "Functions" logs
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
