import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";        // Prisma needs Node, not Edge
export const dynamic = "force-dynamic"; // avoid accidental static/edge

type Params = Promise<{ userId: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { userId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({ status: z.enum(["APPROVED", "REJECTED"]) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  try {
    const { status } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.hostProfile.update({
        where: { userId },
        data: { verification: status },
      });

      if (status === "APPROVED") {
        await tx.user.update({
          where: { id: userId },
          data: { role: "HOST" },
        });
      }
    });

    return NextResponse.json({ ok: true, verification: status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
