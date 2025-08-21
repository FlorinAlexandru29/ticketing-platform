// src/lib/verify.ts
import { prisma } from '@/lib/prisma';
import { generateNumericCode, sha256 } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/mailer';

export const EXPIRES_MIN = 15;

function appBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

export async function issueVerificationCode(userId: string, email: string) {
  const code = generateNumericCode(6);
  const codeHash = sha256(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRES_MIN * 60_000);

  await prisma.emailVerificationCode.upsert({
    where: { userId },
    update: { codeHash, createdAt: now, expiresAt, attempts: 0, lastSentAt: now },
    create: { userId, codeHash, expiresAt },
  });

  const link = new URL('/api/auth/verify/confirm', appBaseUrl());
  link.searchParams.set('email', email);
  link.searchParams.set('code', code);

  await sendVerificationEmail({ to: email, code, link: link.toString() });
}
