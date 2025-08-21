// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { issueVerificationCode } from '@/lib/verify';

const RegisterSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(3).max(30).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = RegisterSchema.parse(body);
    const lower = email.toLowerCase();
    const passwordHash = await hashPassword(password);

    const existing = await prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, emailVerified: true, credential: { select: { id: true } } },
    });

    if (existing) {
      if (existing.credential) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }
      // OAuth-only user — attach credentials + send first code now
      await prisma.credential.create({ data: { userId: existing.id, passwordHash } });
      await issueVerificationCode(existing.id, lower);
      return NextResponse.json(
        { user: { id: existing.id, email: lower, name: name ?? null }, attachedCredential: true },
        { status: 201 }
      );
    }

    // Brand-new user
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { email: lower, name: name ?? null } });
      await tx.credential.create({ data: { userId: u.id, passwordHash } });
      return u;
    });

    await issueVerificationCode(user.id, lower);

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', fields: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
