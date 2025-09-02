import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Force-refresh a Spotify token directly from the DB-stored refresh_token. */
async function forceRefreshSpotifyTokenForUser(userId: string): Promise<string | null> {
  const acct = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: { id: true, refresh_token: true },
  });
  if (!acct?.refresh_token) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: acct.refresh_token,
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
      refresh_token: new_refresh ?? acct.refresh_token,
    },
  });

  return access_token;
}

/** Get a valid (refreshed if needed) Spotify access token for a user from DB. */
async function getValidSpotifyTokenForUser(userId: string): Promise<string | null> {
  const acct = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });
  if (!acct) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(acct.expires_at ?? 0);
  let access = acct.access_token || null;

  // refresh if missing or expiring soon
  if (!access || (exp && exp - 60 <= now)) {
    if (!acct.refresh_token) return null;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: acct.refresh_token,
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
        refresh_token: new_refresh ?? acct.refresh_token,
      },
    });
  }

  return access;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userIdMaybe = session?.user?.id ?? null;
  if (!userIdMaybe) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = userIdMaybe as string;

  // ✅ pull/refresh token from DB (not from session)
  let accessToken = await getValidSpotifyTokenForUser(userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotify not linked or token unavailable" },
      { status: 400 }
    );
  }

  // Collect followed artists (paginated)
  const map = new Map<string, { id: string; name: string; image?: string; genres?: string[] }>();

  async function fetchPage(after?: string) {
    const u = new URL("https://api.spotify.com/v1/me/following");
    u.searchParams.set("type", "artist");
    u.searchParams.set("limit", "50");
    if (after) u.searchParams.set("after", after);

    const res = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } });

    // Token might be invalid → try a one-time forced refresh
    if (res.status === 401) {
      const refreshed = await forceRefreshSpotifyTokenForUser(userId);
      if (!refreshed) return { items: [], after: undefined, done: true };
      accessToken = refreshed;
      const retry = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!retry.ok) {
        console.error("Spotify following retry failed", await retry.text());
        return { items: [], after: undefined, done: true };
      }
      const jj: any = await retry.json();
      return {
        items: jj?.artists?.items ?? [],
        after: jj?.artists?.cursors?.after || undefined,
        done: false,
      };
    }

    if (!res.ok) {
      console.error("Spotify following fetch failed", res.status, await res.text());
      return { items: [], after: undefined, done: true };
    }

    const j: any = await res.json();
    return {
      items: j?.artists?.items ?? [],
      after: j?.artists?.cursors?.after || undefined,
      done: false,
    };
  }

  let after: string | undefined;
  while (true) {
    const page = await fetchPage(after);
    if (page.done) break;

    for (const a of page.items) {
      if (!a?.id) continue;
      // De-dupe into a map (latest info wins)
      map.set(a.id, {
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url,
        genres: Array.isArray(a.genres) ? a.genres : [],
      });
    }

    after = page.after;
    if (!after) break;
  }

  const unique = Array.from(map.values());
  const ids = unique.map((x) => x.id);

  // ⚡️ Chunked batched upserts to avoid long-lived interactive transactions
  // (No options object → avoids the TS error about 'timeout')
  const BATCH = 35;
  for (let i = 0; i < unique.length; i += BATCH) {
    const slice = unique.slice(i, i + BATCH);
    if (slice.length === 0) continue;

    await prisma.$transaction(
      slice.map((a) =>
        prisma.artist.upsert({
          where: { spotifyId: a.id },
          update: { name: a.name, image: a.image, genres: a.genres ?? [] },
          create: { spotifyId: a.id, name: a.name, image: a.image, genres: a.genres ?? [] },
        })
      )
    );
  }

  // Update the user’s followed list (no need to be inside the same transaction)
  await prisma.user.update({
    where: { id: userId },
    data: { followedSpotifyIds: ids },
  });

  return NextResponse.json({ count: ids.length });
}
