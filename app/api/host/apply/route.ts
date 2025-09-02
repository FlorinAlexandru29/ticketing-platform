import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  displayName: z.string().min(2),
  website: z.string().url().optional().or(z.literal("")).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().max(40).optional().or(z.literal("")).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const name = session?.user.name;
  const body = await req.json();
  const input = Schema.parse(body);

  const hp = await prisma.hostProfile.upsert({
    where: { userId: session.user.id },
    update: {
      displayName: input.displayName,
      website: input.website || null,
      contactEmail: input.contactEmail || null,
      phone: input.phone || null,
      verification: "PENDING",
    },
    create: {
      userId: session.user.id,
      displayName: input.displayName,
      website: input.website || null,
      contactEmail: input.contactEmail || null,
      phone: input.phone || null,
      verification: "PENDING",
    },
  });

  return NextResponse.json({ ok: true, verification: hp.verification });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hp = await prisma.hostProfile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ profile: hp });
}
