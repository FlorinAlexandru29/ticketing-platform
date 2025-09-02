import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Always refresh helper (used only on 401 fallback)
async function forceRefreshSpotifyTokenForUser(userId: string): Promise<string | null> {
  const acct = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: { id: true, refresh_token: true },
  });
  if (!acct?.refresh_token) return null;

  const refreshToken = acct.refresh_token as string; // <- assert non-null
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
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

  if (!res.ok) {
    console.error("Spotify force refresh failed", await res.text());
    return null;
  }

  const j = (await res.json()) as any;
  const access_token = j.access_token as string | undefined;
  const expires_in = Number(j.expires_in ?? 3600);
  const new_refresh = j.refresh_token as string | undefined;

  if (!access_token) return null;

  await prisma.account.update({
    where: { id: acct.id },
    data: {
      access_token,
      expires_at: Math.floor(Date.now() / 1000) + expires_in,
      refresh_token: new_refresh ?? refreshToken,
    },
  });

  return access_token;
}

async function getValidSpotifyTokenForUser(userId: string): Promise<string | null> {
  const acct = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });
  if (!acct) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(acct.expires_at ?? 0);
  let access = acct.access_token || null;

  // refresh if expiring soon or missing
  if (!access || (exp && exp - 60 <= now)) {
    if (!acct.refresh_token) return null;

    const refreshToken = acct.refresh_token as string; // <- assert non-null
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
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

    if (!res.ok) {
      console.error("Spotify refresh failed", await res.text());
      return null;
    }

    const j = (await res.json()) as any;
    access = j.access_token as string | null;
    const expires_in = Number(j.expires_in ?? 3600);
    const new_refresh = j.refresh_token as string | undefined;

    if (!access) return null;

    await prisma.account.update({
      where: { id: acct.id },
      data: {
        access_token: access,
        expires_at: Math.floor(Date.now() / 1000) + expires_in,
        refresh_token: new_refresh ?? refreshToken,
      },
    });
  }

  return access;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ✅ pull/refresh token from DB (not from session)
  let accessToken = await getValidSpotifyTokenForUser(userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotify not linked or token unavailable" },
      { status: 400 }
    );
  }

  const ids: string[] = [];
  const artistsPayload: { id: string; name: string; image?: string; genres?: string[] }[] = [];

  async function fetchPage(after?: string) {
    const u = new URL("https://api.spotify.com/v1/me/following");
    u.searchParams.set("type", "artist");
    u.searchParams.set("limit", "50");
    if (after) u.searchParams.set("after", after);

    const res = await fetch(u, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Token might have been revoked -> try one forced refresh once
    if (res.status === 401) {
      let refreshed: string | null = null;
      if (typeof userId === "string") {
        refreshed = await forceRefreshSpotifyTokenForUser(userId);
      }
      if (!refreshed) return { items: [], after: undefined, done: true };
      accessToken = refreshed;
      const retry = await fetch(u, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!retry.ok) {
        console.error("Spotify following retry failed", await retry.text());
        return { items: [], after: undefined, done: true };
      }
      const jj: any = await retry.json();
      const items = jj?.artists?.items ?? [];
      const nextAfter = jj?.artists?.cursors?.after || undefined;
      return { items, after: nextAfter, done: false };
    }

    if (!res.ok) {
      console.error("Spotify following fetch failed", res.status, await res.text());
      return { items: [], after: undefined, done: true };
    }

    const j: any = await res.json();
    const items = j?.artists?.items ?? [];
    const nextAfter = j?.artists?.cursors?.after || undefined;
    return { items, after: nextAfter, done: false };
  }

  let after: string | undefined;
  while (true) {
    const page = await fetchPage(after);
    if (page.done) break;

    for (const a of page.items) {
      if (!a?.id) continue;
      ids.push(a.id);
      artistsPayload.push({
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url,
        genres: Array.isArray(a.genres) ? a.genres : [],
      });
    }

    after = page.after;
    if (!after) break;
  }

  const uniqueIds = Array.from(new Set(ids));

  await prisma.$transaction(async (tx) => {
    // Cache/update Artist rows (helpful elsewhere)
    for (const a of artistsPayload) {
      await tx.artist.upsert({
        where: { spotifyId: a.id },
        update: { name: a.name, image: a.image, genres: a.genres ?? [] },
        create: { spotifyId: a.id, name: a.name, image: a.image, genres: a.genres ?? [] },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { followedSpotifyIds: uniqueIds },
    });
  });

  return NextResponse.json({ count: uniqueIds.length });
}
