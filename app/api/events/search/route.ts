import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const date = searchParams.get("date") || null;

    if (q.length < 2) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // optional date filter
    let dateFilter: any = {};
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        dateFilter = {
          startAt: {
            gte: d,
            lt: nextDay,
          },
        };
      }
    }

    const events = await prisma.event.findMany({
      where: {
        ...dateFilter,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { venueName: { contains: q, mode: "insensitive" } },
          {
            lineup: {
              some: {
                artist: {
                  name: { contains: q, mode: "insensitive" },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        posterUrl: true,
        venueName: true,
      },
      orderBy: { startAt: "asc" },
      take: 20,
    });

    return NextResponse.json({ items: events });
  } catch (e: any) {
    console.error("[events/search]", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
