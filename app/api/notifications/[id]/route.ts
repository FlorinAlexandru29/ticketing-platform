import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function DELETE(_: Request, { params }: { params: Params }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasSpotify = Array.isArray((session.user as any)?.oauthProviders) &&
                     (session.user as any).oauthProviders.includes("spotify");
  if (!hasSpotify) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notif = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
  if (!notif || notif.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
