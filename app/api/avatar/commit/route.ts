export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { supabaseAdmin } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Get storage-relative path from a public URL, ignoring querystring
// e.g. https://<ref>.supabase.co/storage/v1/object/public/avatars/user123.png?v=123 -> "user123.png"
function extractRelPath(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    // New public URL (no query)
    const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // Versioned URL so caches always fetch newest on reload
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    // Find previous image (if any) and delete its object (ignore not-found errors)
    const prev = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });
    const oldRelPath = extractRelPath(prev?.image);
    if (oldRelPath && oldRelPath !== path) {
      await supabaseAdmin.storage.from("avatars").remove([oldRelPath]).catch(() => {});
    }

    // Persist versioned URL
    await prisma.user.update({
      where: { id: userId },
      data: { image: versionedUrl },
    });

    return NextResponse.json({ url: versionedUrl });
  } catch (e: any) {
    console.error("avatar/commit error:", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
