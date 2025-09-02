// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";        // Prisma needs Node runtime
export const dynamic = "force-dynamic"; // avoid edge/static bundling

type Params = Promise<{ id: string }>;

export async function DELETE(_: Request, { params }: { params: Params }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;

  if (me?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (id === session?.user?.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // If the user hosts events, delete them first (these cascade to tiers/lineup/tickets)
      await tx.event.deleteMany({ where: { hostId: id } });

      // Remove host profile (if they applied / are a host)
      await tx.hostProfile.deleteMany({ where: { userId: id } });

      // Clear any tickets owned by this user (belt & suspenders, even though Ticket.owner has onDelete: SetNull)
      await tx.ticket.updateMany({ where: { ownerId: id }, data: { ownerId: null } });

      // Remove notifications targeted to this user
      await tx.notification.deleteMany({ where: { userId: id } });

      // Clean up local credentials / verification codes
      await tx.credential.deleteMany({ where: { userId: id } });
      await tx.emailVerificationCode.deleteMany({ where: { userId: id } });

      // End sessions and unlink OAuth accounts (your schema already cascades, but do it explicitly)
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.account.deleteMany({ where: { userId: id } });

      // Finally, delete the user
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
