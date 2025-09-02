import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      ids.push(a.id);
      artistsPayload.push({
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url,
        genres: a.genres ?? [],
      });
    }
    after = j?.artists?.cursors?.after || undefined;
    if (!after) break;
  }

  // Deduplicate
  const uniqueIds = Array.from(new Set(ids));

  await prisma.$transaction(async (tx) => {
    // Cache/update Artist rows (handy for cards/reco UI)
    for (const a of artistsPayload) {
      await tx.artist.upsert({
        where: { spotifyId: a.id },
        update: { name: a.name, image: a.image, genres: a.genres ?? [] },
        create: { spotifyId: a.id, name: a.name, image: a.image, genres: a.genres ?? [] },
      });
    }
    // Store on the user as a scalar-list array
    await tx.user.update({
      where: { id: userId },
      data: { followedSpotifyIds: uniqueIds },
    });
  });

  return NextResponse.json({ count: uniqueIds.length });
}
