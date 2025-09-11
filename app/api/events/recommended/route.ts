// app/api/events/recommended/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  const url = new URL(req.url);
  const MAX = Math.min(20, Number(url.searchParams.get("limit") || 10));
  const now = new Date();

  // Recommendations are not displayed for users that are not logged in.
  if (!userId) return NextResponse.json({ items: [] });

  // Load user's city + followed Spotify IDs
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { city: true, followedSpotifyIds: true },
  });

  const city = user?.city ?? null;
  const followedIds = user?.followedSpotifyIds ?? [];

  
  // - Require Spotify-linked follows
  // - Require user city
  if (!city || followedIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  
  const events = await prisma.event.findMany({
    where: {
      startAt: { gte: now },
      city,
      lineup: {
        some: {
          artist: {
            spotifyId: { in: followedIds },
          },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: MAX * 3, 
    select: {
      id: true,
      title: true,
      posterUrl: true,
      startAt: true,
      city: true,
      country: true,
      eventType: true,
      venueName: true,
      lineup: { select: { artist: { select: { spotifyId: true } } } },
    },
  });

  const ranked = events
    .map((ev) => {
      const lineupIds = ev.lineup.map((l) => l.artist.spotifyId).filter(Boolean) as string[];
      const matchCount = lineupIds.filter((id) => followedIds.includes(id)).length;
      const daysAway = Math.floor((+ev.startAt - +now) / 86_400_000);
      // score is based on the more artists are followed and the sooner the event
      const score = matchCount * 100 - daysAway;
      return { ev, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX)
    .map(({ ev }) => ev);

  return NextResponse.json({ items: ranked });
}
