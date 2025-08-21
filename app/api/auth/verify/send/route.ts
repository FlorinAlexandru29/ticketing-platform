// app/api/auth/verify/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumericCode, sha256 } from "@/lib/otp";
import { sendVerificationEmail } from "@/lib/mailer";

const EXPIRES_MIN = 15;
const RESEND_COOLDOWN_SEC = 30;
const baseUrl =
process.env.NEXTAUTH_URL
?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const lower = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: lower }, select: { id: true, emailVerified: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const existing = await prisma.emailVerificationCode.findUnique({ where: { userId: user.id } });
    if (existing) {
      const secs = (Date.now() - existing.lastSentAt.getTime()) / 1000;
      if (secs < RESEND_COOLDOWN_SEC) {
        return NextResponse.json({ error: "Please wait before resending." }, { status: 429 });
      }
    }

    const code = generateNumericCode(6);
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + EXPIRES_MIN * 60_000);

    await prisma.emailVerificationCode.upsert({
      where: { userId: user.id },
      update: { codeHash, createdAt: new Date(), expiresAt, attempts: 0, lastSentAt: new Date() },
      create: { userId: user.id, codeHash, expiresAt },
    });

    const linkUrl = new URL('/api/auth/verify/confirm', baseUrl);
    linkUrl.searchParams.set('email', lower);
    linkUrl.searchParams.set('code', code);

    await sendVerificationEmail({ to: lower, code, link: linkUrl.toString() });

    return NextResponse.json({ ok: true, sent: true, expiresInMin: EXPIRES_MIN });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to send code" }, { status: 500 });
  }
}
