// app/api/account/change-password/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { oldPassword, newPassword } = await req.json().catch(() => ({}));
  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  // Ensure user has a credential record
  const cred = await prisma.credential.findUnique({
    where: { userId },
    select: { passwordHash: true },
  });
  if (!cred) {
    return NextResponse.json({ error: "Password change is available only for email/password accounts" }, { status: 400 });
  }

  // Verify old password
  const ok = await verifyPassword(String(oldPassword), cred.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
  }

  // Disallow identical new password
  const same = await verifyPassword(String(newPassword), cred.passwordHash);
  if (same) {
    return NextResponse.json({ error: "New password must be different from the old one" }, { status: 400 });
  }

  // Update hash
  const newHash = await hashPassword(String(newPassword));
  await prisma.credential.update({
    where: { userId },
    data: { passwordHash: newHash },
  });

  // (Optional) Invalidate other sessions here if you want to force re-login elsewhere.

  return NextResponse.json({ ok: true });
}
