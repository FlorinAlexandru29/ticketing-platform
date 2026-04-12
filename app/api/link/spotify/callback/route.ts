// app/api/link/spotify/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appBase =
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");

/** Pull all followed artists for the current user using the provided access token. */
async function pullFollowedArtists(accessToken: string) {
  const ids: string[] = [];
  const artistsPayload: { id: string; name: string; image?: string;}[] = [];

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

  // Clear CSRF-ish cookies either way
  c.delete("sp_link_state");
  c.delete("sp_link_user");

  if (!cookieState || cookieState !== state || !targetUserId) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=state_mismatch`, appBase));
  }

  // Must be logged in as the user you're linking *to*
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  if (!currentUserId || currentUserId !== targetUserId) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=session_changed`, appBase));
  }

  // Exchange the authorization code for tokens
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
    return NextResponse.redirect(new URL(`/my-profile?linkErr=token_${tokenRes.status}`, appBase));
  }

  const access_token = tokenJson.access_token as string;
  const refresh_token = tokenJson.refresh_token as string | undefined;
  const expires_in = Number(tokenJson.expires_in ?? 3600);

  // Identify the Spotify account
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const me: any = await meRes.json();
  if (!meRes.ok || !me?.id) {
    return NextResponse.redirect(new URL(`/my-profile?linkErr=profile_${meRes.status}`, appBase));
  }

  const provider = "spotify";
  const providerAccountId = String(me.id);
  const scope = "user-read-email user-follow-read";

  // Link the account; merge if this Spotify is already linked to a different user
  await prisma.$transaction(async (tx) => {
    const existing = await tx.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      select: { id: true, userId: true },
    });

    if (existing && existing.userId !== currentUserId) {
      const oldUserId = existing.userId;

      // Move domain data
      await tx.ticket.updateMany({ where: { ownerId: oldUserId }, data: { ownerId: currentUserId } });
      await tx.event.updateMany({ where: { hostId: oldUserId }, data: { hostId: currentUserId } });

      // (Optional) migrate HostProfile if you use it
      const oldHP = await tx.hostProfile.findUnique({ where: { userId: oldUserId } });
      if (oldHP) {
        const newHP = await tx.hostProfile.findUnique({ where: { userId: currentUserId } });
        if (!newHP) {
          await tx.hostProfile.update({ where: { id: oldHP.id }, data: { userId: currentUserId } });
        } else {
          await tx.hostProfile.delete({ where: { id: oldHP.id } });
        }
      }

      // Reassign OAuth accounts and remove old sessions & user row
      await tx.account.updateMany({ where: { userId: oldUserId }, data: { userId: currentUserId } });
      
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

    // Enrich current user if fields are empty
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

  // 🔁 Best-effort: Immediately sync followed artists with the fresh token
  try {
    const { uniqueIds, artistsPayload } = await pullFollowedArtists(access_token);

    if (artistsPayload.length) {
      // Upsert in small chunks to avoid long-lived transactions
      const BATCH = 35;
      for (let i = 0; i < artistsPayload.length; i += BATCH) {
        const slice = artistsPayload.slice(i, i + BATCH);
        await prisma.$transaction(
          slice.map((a) =>
            prisma.artist.upsert({
              where: { spotifyId: a.id },
              update: { name: a.name, image: a.image},
              create: { spotifyId: a.id, name: a.name, image: a.image},
            })
          )
        );
      }
    }

    // Save the followed IDs on the user (outside of the upsert batches)
    await prisma.user.update({
      where: { id: currentUserId },
      data: { followedSpotifyIds: uniqueIds },
    });
  } catch (e) {
    console.error("Spotify followed sync after link failed:", e);
    // Non-fatal — continue
  }

  return NextResponse.redirect(new URL("/my-profile?linked=1", appBase));
}
