import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ items: [] });

  const hasSpotify = Array.isArray((session.user as any)?.oauthProviders) &&
                     (session.user as any).oauthProviders.includes("spotify");
  if (!hasSpotify) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const markRead = searchParams.get("markRead") === "1";

  if (markRead) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, message: true, eventId: true, createdAt: true, readAt: true },
  });

  // shape createdAt to string for the client
  const shaped = items.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  }));

  return NextResponse.json({ items: shaped });
}
