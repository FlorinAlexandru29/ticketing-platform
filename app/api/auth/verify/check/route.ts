// app/api/auth/verify/check/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/otp";

const MAX_ATTEMPTS = 6;

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

    const lower = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: lower }, select: { id: true, emailVerified: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const row = await prisma.emailVerificationCode.findUnique({ where: { userId: user.id } });
    if (!row) return NextResponse.json({ error: "No active code, please resend" }, { status: 400 });
    if (row.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Too many attempts. Resend a new code." }, { status: 429 });
    if (row.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Code expired. Resend a new code." }, { status: 400 });

    const ok = row.codeHash === sha256(String(code).trim());
    if (!ok) {
      await prisma.emailVerificationCode.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // success: verify and clear code
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
      prisma.emailVerificationCode.delete({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ ok: true, verified: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Verification failed" }, { status: 500 });
  }
}
