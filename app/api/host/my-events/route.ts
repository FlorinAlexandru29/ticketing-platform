import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const upcoming = (searchParams.get("upcoming") ?? "1") !== "0";

  const where: any = { hostId: userId };
  if (upcoming) where.startAt = { gte: new Date() };

  const items = await prisma.event.findMany({
    where,
    orderBy: { startAt: "asc" },
    select: { id: true, title: true, startAt: true },
  });

  return NextResponse.json({
    items: items.map(i => ({ ...i, startAt: i.startAt.toISOString() })),
  });
}
