import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const appBase =
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");

async function pullFollowedArtists(accessToken: string) {
  const ids: string[] = [];
  const artistsPayload: { id: string; name: string; image?: string; genres?: string[] }[] = [];

  let after: string | undefined;
  while (true) {
    const u = new URL("https://api.spotify.com/v1/me/following");
    u.searchParams.set("type", "artist");
    u.searchParams.set("limit", "50");
    if (after) u.searchParams.set("after", after);

    const res = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) break;
    const j: any = await res.json();

    const items = j?.artists?.items ?? [];
    for (const a of items) {
      if (!a?.id) continue;
      ids.push(a.id);
      artistsPayload.push({
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url,
        genres: Array.isArray(a.genres) ? a.genres : [],
      });
    }
    after = j?.artists?.cursors?.after || undefined;
    if (!after) break;
  }

  const uniqueIds = Array.from(new Set(ids));
  return { uniqueIds, artistsPayload };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=${encodeURIComponent(err)}`, appBase));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=missing_code_state`, appBase));
  }

  const c = await cookies();
  const cookieState = c.get("sp_link_state")?.value;
  const targetUserId = c.get("sp_link_user")?.value;

  // clear cookies either way
  c.delete("sp_link_state");
  c.delete("sp_link_user");

  if (!cookieState || cookieState !== state || !targetUserId) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=state_mismatch`, appBase));
  }

  // must be logged in as the user you're linking to
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  if (!currentUserId || currentUserId !== targetUserId) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=session_changed`, appBase));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: new URL("/api/link/spotify/callback", appBase).toString(),
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  });
  const tokenJson: any = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL(`/my-profile?linkErr=token_${tokenRes.status}`, appBase)
    );
  }

  const access_token = tokenJson.access_token as string;
  const refresh_token = tokenJson.refresh_token as string | undefined;
  const expires_in = Number(tokenJson.expires_in ?? 3600);

  // Identify account
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const me: any = await meRes.json();
  if (!meRes.ok || !me?.id) {
    return NextResponse.redirect(
      new URL(`/my-profile?linkErr=profile_${meRes.status}`, appBase)
    );
  }

  const provider = "spotify";
  const providerAccountId = String(me.id);
  const scope = "user-read-email user-follow-read";

  // Link/merge account and update user avatar/name if missing
  await prisma.$transaction(async (tx) => {
    const existing = await tx.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      select: { id: true, userId: true },
    });

    if (existing && existing.userId !== currentUserId) {
      const oldUserId = existing.userId;
      await tx.ticket.updateMany({ where: { ownerId: oldUserId }, data: { ownerId: currentUserId } });
      await tx.event.updateMany({ where: { hostId: oldUserId }, data: { hostId: currentUserId } });
      await tx.account.updateMany({ where: { userId: oldUserId }, data: { userId: currentUserId } });
      await tx.session.deleteMany({ where: { userId: oldUserId } });
      await tx.user.delete({ where: { id: oldUserId } }).catch(() => {});
    }

    const expires_at = Math.floor(Date.now() / 1000) + expires_in;
    await tx.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: {
        userId: currentUserId,
        type: "oauth",
        provider,
        providerAccountId,
        access_token,
        refresh_token,
        token_type: "Bearer",
        scope,
        expires_at,
      },
      update: {
        userId: currentUserId,
        access_token,
        refresh_token: refresh_token ?? undefined,
        token_type: "Bearer",
        scope,
        expires_at,
      },
    });

    // Optional: enrich current user if fields are empty
    const spImage: string | undefined = me?.images?.[0]?.url;
    const spName: string | undefined = me?.display_name || undefined;
    const current = await tx.user.findUnique({ where: { id: currentUserId }, select: { image: true, name: true } });

    const updates: any = {};
    if (!current?.image && spImage) updates.image = spImage;
    if (!current?.name && spName) updates.name = spName;
    if (Object.keys(updates).length) {
      await tx.user.update({ where: { id: currentUserId }, data: updates });
    }
  });

  // 🔁 Immediately sync followed artists with this fresh token (best-effort)
  try {
    const { uniqueIds, artistsPayload } = await pullFollowedArtists(access_token);
    if (uniqueIds.length) {
      await prisma.$transaction(async (tx) => {
        for (const a of artistsPayload) {
          await tx.artist.upsert({
            where: { spotifyId: a.id },
            update: { name: a.name, image: a.image, genres: a.genres ?? [] },
            create: { spotifyId: a.id, name: a.name, image: a.image, genres: a.genres ?? [] },
          });
        }
        await tx.user.update({
          where: { id: currentUserId },
          data: { followedSpotifyIds: uniqueIds },
        });
      });
    }
  } catch (e) {
    console.error("Spotify followed sync after link failed:", e);
    // continue — not fatal to linking
  }

  return NextResponse.redirect(new URL("/my-profile?linked=1", appBase));
}
