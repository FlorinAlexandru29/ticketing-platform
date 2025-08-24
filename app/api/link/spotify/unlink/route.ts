// app/api/link/spotify/unlink/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acct = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: { id: true },
  });
  if (!acct) return NextResponse.json({ ok: true }); // already unlinked

  // Is Spotify the only login method?
  const [otherOauthCount, hasCredential] = await Promise.all([
    prisma.account.count({
      where: { userId, provider: { not: "spotify" } },
    }),
    prisma.credential.findUnique({ where: { userId }, select: { id: true } }),
  ]);

  const canUnlink = !!hasCredential || otherOauthCount > 0;
  if (!canUnlink) {
    return NextResponse.json(
      { error: "Cannot unlink: Spotify is your only login method." },
      { status: 400 }
    );
  }

  await prisma.account.delete({ where: { id: acct.id } });
  return NextResponse.json({ ok: true });
}
