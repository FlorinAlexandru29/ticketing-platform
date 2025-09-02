// app/api/notifications/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function DELETE(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure the notification belongs to the user
  const notif = await prisma.notification.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!notif || notif.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
