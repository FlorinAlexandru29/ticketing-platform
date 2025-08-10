// lib/auth-options.ts
import type { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async redirect({ baseUrl }) {
      // Always redirect to home page
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
