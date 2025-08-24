import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import crypto from "crypto";

const appBase =
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // must be logged in to link
    return NextResponse.redirect(new URL("/login", appBase));
  }

  // CSRF-ish state
  const state = crypto.randomBytes(24).toString("hex");
  const cb = new URL("/api/link/spotify/callback", appBase);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", cb.toString());
  url.searchParams.set("scope", "user-read-email");
  url.searchParams.set("state", state);

  const c = await cookies();
  // keep for 15 min
  c.set("sp_link_state", state, { httpOnly: true, path: "/", maxAge: 900 });
  c.set("sp_link_user", session.user.id, { httpOnly: true, path: "/", maxAge: 900 });

  return NextResponse.redirect(url);
}
