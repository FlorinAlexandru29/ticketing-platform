// app/api/profile/update/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

function parseISODateOnly(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 1900 || y > 2100) return null;
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (m - 1) || dt.getUTCDate() !== d) return null;
  return dt;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, birthdate, countryCode, country, city } = body as {
      name?: string;
      birthdate?: string | null;
      countryCode?: string | null;
      country?: string | null;
      city?: string | null;
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credential: { select: { id: true } }, birthdate: true },
    });
    const hasCred = !!user?.credential?.id;
    const currentBirth = user?.birthdate ?? null;

    const data: any = {};
    const wantsToChangeName = typeof name !== "undefined";
    const wantsToChangeBirth = typeof birthdate !== "undefined";
    const wantsToChangeCountry = typeof countryCode !== "undefined" || typeof country !== "undefined";
    const wantsToChangeCity = typeof city !== "undefined";

    // name: credentials only
    if (wantsToChangeName) {
      if (!hasCred) return NextResponse.json({ error: "Editing name is only available for email/password accounts." }, { status: 403 });
      const trimmed = String(name ?? "").trim();
      if (trimmed.length === 0) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      data.name = trimmed;
    }

    // birthdate: credentials OR (oauth-only and currently null → allow setting once)
    if (wantsToChangeBirth) {
      const settingNull = birthdate === "" || birthdate === null;
      if (!hasCred) {
        if (currentBirth !== null) {
          return NextResponse.json({ error: "Birth date is read-only for OAuth accounts once set." }, { status: 403 });
        }
        if (settingNull) {
          return NextResponse.json({ error: "Please provide a valid date (YYYY-MM-DD)." }, { status: 400 });
        }
      }
      if (settingNull) {
        data.birthdate = null;
      } else {
        const dt = parseISODateOnly(String(birthdate));
        if (!dt) return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
        data.birthdate = dt;
      }
    }

    // country/city: anyone can edit
    if (wantsToChangeCountry) {
      if (countryCode != null) {
        const cc = String(countryCode).toUpperCase();
        if (cc !== "" && !/^[A-Z]{2}$/.test(cc)) return NextResponse.json({ error: "countryCode must be ISO-3166 alpha-2 (e.g. RO)." }, { status: 400 });
        data.countryCode = cc || null;
      }
      if (country != null) {
        const ctry = String(country).trim();
        data.country = ctry || null;
      }
    }
    if (wantsToChangeCity) {
      const c = String(city ?? "").trim();
      data.city = c || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No changes submitted." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { name: true, birthdate: true, countryCode: true, country: true, city: true },
    });

    return NextResponse.json({
      ok: true,
      user: {
        name: updated.name ?? null,
        birthdate: updated.birthdate ? new Date(updated.birthdate).toISOString().slice(0, 10) : null,
        countryCode: updated.countryCode ?? null,
        country: updated.country ?? null,
        city: updated.city ?? null,
      },
    });
  } catch (e: any) {
    console.error("profile/update error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
