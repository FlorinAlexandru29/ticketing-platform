// app/api/spotify/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function refresh(access: {
  refresh_token?: string | null;
}) {
  if (!access.refresh_token) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(access.refresh_token),
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

  if (!res.ok) return null;
  const data: any = await res.json();
  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string | undefined) ?? undefined,
    expires_at:
      Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find Spotify account for this user
  const acct = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: {
      id: true,
      userId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });
  if (!acct) return NextResponse.json({ error: "Not linked" }, { status: 404 });

  let accessToken = acct.access_token ?? "";
  const now = Math.floor(Date.now() / 1000);

  // If token expired (or close), try refresh
  if (!accessToken || (acct.expires_at && acct.expires_at <= now + 30)) {
    const r = await refresh({ refresh_token: acct.refresh_token });
    if (r?.access_token) {
      accessToken = r.access_token;
      await prisma.account.update({
        where: { id: acct.id },
        data: {
          access_token: r.access_token,
          expires_at: r.expires_at,
          // only overwrite refresh_token if Spotify returned a new one
          ...(r.refresh_token ? { refresh_token: r.refresh_token } : {}),
        },
      });
    }
  }

  // Try fetching the profile
  let meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // If unauthorized and we have refresh_token, try one more refresh
  if (meRes.status === 401 && acct.refresh_token) {
    const r = await refresh({ refresh_token: acct.refresh_token });
    if (r?.access_token) {
      accessToken = r.access_token;
      await prisma.account.update({
        where: { id: acct.id },
        data: {
          access_token: r.access_token,
          expires_at: r.expires_at,
          ...(r.refresh_token ? { refresh_token: r.refresh_token } : {}),
        },
      });
      meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  }

  if (!meRes.ok) {
    const text = await meRes.text();
    return NextResponse.json(
      { error: `Spotify /me failed: ${meRes.status} ${text.slice(0, 120)}` },
      { status: 502 }
    );
  }

  const me: any = await meRes.json();
  return NextResponse.json({
    display_name: me?.display_name ?? null,
    external_url: me?.external_urls?.spotify ?? null,
    product: me?.product ?? null,
    country: me?.country ?? null,
    images: Array.isArray(me?.images) ? me.images : [],
  });
}
