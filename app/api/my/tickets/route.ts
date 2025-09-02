import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      price: true,
      currency: true,
      createdAt: true,
      validatedAt: true, // if you added this
      tier: { select: { id: true, category: true, description: true } },
      event: {
        select: {
          id: true,
          title: true,
          startAt: true,
          venueName: true,
          city: true,
          country: true,
          posterUrl: true,
        },
      },
    },
  });

  // group by event
  const byEvent = new Map<
    string,
    {
      event: {
        id: string;
        title: string;
        startAt: string;
        venueName: string;
        city: string;
        country: string | null;
        posterUrl: string | null;
      };
      tickets: Array<{
        id: string;
        code: string;
        price: number;
        currency: string;
        validatedAt: string | null;
        tier: { id: string; category: string; description: string | null };
      }>;
    }
  >();

  for (const t of tickets) {
    const e = t.event;
    const key = e.id;
    if (!byEvent.has(key)) {
      byEvent.set(key, {
        event: {
          id: e.id,
          title: e.title,
          startAt: e.startAt.toISOString(),
          venueName: e.venueName,
          city: e.city,
          country: e.country ?? null,
          posterUrl: e.posterUrl ?? null,
        },
        tickets: [],
      });
    }
    byEvent.get(key)!.tickets.push({
      id: t.id,
      code: t.code,
      price: t.price,
      currency: t.currency,
      validatedAt: t.validatedAt ? t.validatedAt.toISOString() : null,
      tier: {
        id: t.tier?.id ?? "",
        category: t.tier?.category ?? "-",
        description: t.tier?.description ?? null,
      },
    });
  }

  return NextResponse.json({
    groups: Array.from(byEvent.values()),
  });
}
