import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  const MAX = Math.min(20, Number(new URL(req.url).searchParams.get("limit") || 10));
  const now = new Date();

  let city: string | null = null;
  let followedIds: string[] = [];
  if (userId) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { city: true, followedSpotifyIds: true },
    });
    city = u?.city ?? null;
    followedIds = u?.followedSpotifyIds ?? [];
  }

  const events = await prisma.event.findMany({
    where: { startAt: { gte: now } },
    orderBy: { startAt: "asc" },
    take: 200,
    select: {
      id: true, title: true, posterUrl: true, startAt: true,
      city: true, country: true, eventType: true, venueName: true,
      lineup: { select: { artist: { select: { spotifyId: true } } } },
    },
  });

  const scored = events.map(ev => {
    let score = 0;
    const days = Math.floor((+ev.startAt - +now) / 86_400_000);
    score += Math.max(0, 14 - days);
    if (city && ev.city.toLowerCase() === city.toLowerCase()) score += 5;

    const lineupIds = ev.lineup.map(l => l.artist.spotifyId).filter(Boolean);
    const matchCount = lineupIds.filter(id => followedIds.includes(id)).length;
    if (matchCount > 0) score += 10 + matchCount * 5;

    return { ev, score };
  })
  .sort((a,b) => b.score - a.score)
  .slice(0, MAX)
  .map(({ ev }) => ev);

  const items = scored.length ? scored : events.slice(0, MAX);
  return NextResponse.json({ items });
}
