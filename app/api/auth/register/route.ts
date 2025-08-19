// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).regex(/^[A-Za-z][A-Za-z0-9-]*$/).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, username } = RegisterSchema.parse(body);
    const lower = email.toLowerCase();

    // Ensure email/username free
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: lower }, username ? { username } : undefined].filter(Boolean) as any },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Email or username already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: lower, username: username ?? null },
      });
      await tx.credential.create({
        data: { userId: u.id, passwordHash },
      });
      return u;
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, username: user.username } }, { status: 201 });
  } catch (err: any) {
    const msg = err?.issues?.[0]?.message ?? err?.message ?? 'Invalid request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
