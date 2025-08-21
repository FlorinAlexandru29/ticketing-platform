// app/api/auth/verify/confirm/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sha256 } from '@/lib/otp';

function baseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').toLowerCase().trim();
  const code  = (url.searchParams.get('code')  || '').trim();

  const toVerify = `${baseUrl()}/verify`;

  if (!email || !code) {
    return NextResponse.redirect(`${toVerify}?error=expired`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.redirect(`${toVerify}?error=expired`);
  }

  // already verified => treat link as expired/used
  if (user.emailVerified) {
    return NextResponse.redirect(`${toVerify}?email=${encodeURIComponent(email)}&error=expired`);
  }

  const rec = await prisma.emailVerificationCode.findUnique({
    where: { userId: user.id },
  });

  if (!rec) {
    return NextResponse.redirect(`${toVerify}?email=${encodeURIComponent(email)}&error=expired`);
  }

  const now = Date.now();
  const isExpired = rec.expiresAt.getTime() < now;
  const matches   = rec.codeHash === sha256(code);

  if (isExpired || !matches) {
    return NextResponse.redirect(`${toVerify}?email=${encodeURIComponent(email)}&error=expired`);
  }

  // mark verified and clean up
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationCode.delete({
      where: { userId: user.id },
    }),
  ]);

  return NextResponse.redirect(`${toVerify}?email=${encodeURIComponent(email)}&success=1`);
}
