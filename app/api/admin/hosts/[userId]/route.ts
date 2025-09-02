import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    : null;
  if (me?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = z.object({ status: z.enum(["APPROVED","REJECTED"]) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  try {
    const { status } = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      const hp = await tx.hostProfile.update({
        where: { userId: params.userId },
        data: { verification: status }
      });
      if (status === "APPROVED") {
        await tx.user.update({ where: { id: params.userId }, data: { role: "HOST" } });
      }
      return hp;
    });
    return NextResponse.json({ ok: true, verification: updated.verification });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
