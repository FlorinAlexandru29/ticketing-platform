// app/api/account/delete/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

async function handleDelete() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Block delete if user is hosting events (prevents orphaned events)
    const hostedCount = await prisma.event.count({ where: { hostId: userId } });
    if (hostedCount > 0) {
      return NextResponse.json(
        {
          error:
            'You are hosting events. Please transfer or delete them before deleting your account.',
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Remove auth surfaces
      await tx.account.deleteMany({ where: { userId } });
      await tx.credential.deleteMany({ where: { userId } });
      await tx.emailVerificationCode.deleteMany({ where: { userId } });
      await tx.hostProfile.deleteMany({ where: { userId } });

      // Tickets now remain; FK is ON DELETE SET NULL on Ticket.ownerId.
      await tx.user.delete({ where: { id: userId } });
    });

    // Proactively clear NextAuth cookie (covers both secure/non-secure names)
    const res = NextResponse.json({ ok: true });
    res.cookies.set('next-auth.session-token', '', { path: '/', expires: new Date(0) });
    res.cookies.set('__Secure-next-auth.session-token', '', { path: '/', expires: new Date(0) });
    return res;
  } catch (e) {
    console.error('Delete account failed:', e);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

export async function DELETE() {
  return handleDelete();
}
export async function POST() {
  return handleDelete();
}
