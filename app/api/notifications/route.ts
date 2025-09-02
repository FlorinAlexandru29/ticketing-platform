// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const markRead = (searchParams.get("markRead") ?? "0") === "1";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      event: { select: { id: true, title: true } },
    },
  });

  if (markRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ items });
}
