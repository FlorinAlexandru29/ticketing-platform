import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";        // Prisma needs Node runtime
export const dynamic = "force-dynamic"; // avoid edge/static

const Schema = z.object({
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters"),
  // optional strings that may be empty -> treat empty as null
  website: z.string().trim().optional().default(""),
  contactEmail: z.string().trim().optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
});

function normalizeWebsite(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { displayName, website, contactEmail, phone } = parsed.data;

    // validate/normalize website if provided
    const normWebsite = normalizeWebsite(website);
    if (website && !normWebsite) {
      return NextResponse.json(
        { error: "Website must be a valid URL (include http(s)://)" },
        { status: 400 }
      );
    }

    // validate email if provided (Zod email for non-empty)
    if (contactEmail) {
      const emailCheck = z.string().email().safeParse(contactEmail);
      if (!emailCheck.success) {
        return NextResponse.json({ error: "Invalid contact email" }, { status: 400 });
      }
    }

    const hp = await prisma.hostProfile.upsert({
      where: { userId: session.user.id },
      update: {
        displayName,
        website: normWebsite,
        contactEmail: contactEmail || null,
        phone: phone || null,
        verification: "PENDING",
      },
      create: {
        userId: session.user.id,
        displayName,
        website: normWebsite,
        contactEmail: contactEmail || null,
        phone: phone || null,
        verification: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, verification: hp.verification });
  } catch (e) {
    console.error("Host apply POST error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const hp = await prisma.hostProfile.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json({ profile: hp });
  } catch (e) {
    console.error("Host apply GET error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
