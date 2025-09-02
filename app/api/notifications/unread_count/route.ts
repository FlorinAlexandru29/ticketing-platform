import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ count: 0 });

  const providers = (session?.user as any)?.oauthProviders as string[] | undefined;
  const hasSpotify = Array.isArray(providers) && providers.includes("spotify");
  if (!hasSpotify) return NextResponse.json({ count: 0 });

  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  return NextResponse.json({ count });
}
