import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
// If you're on NextAuth v4, use: import { getServerSession } from "next-auth/next"; and your authOptions.

export async function POST(req: Request) {
  // --- auth guard ---
  const session = await getServerSession(authOptions); // v5
  // const session = await getServerSession(authOptions); // v4 alternative
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ext } = await req.json();
  if (!ext) return NextResponse.json({ error: "Missing file extension" }, { status: 400 });

  // one file per user (upsert). Add timestamp if you want versions.
  const path = `avatars/${userId}.${ext.toLowerCase()}`;

  const { data, error } = await supabaseAdmin
    .storage.from("avatars")
    .createSignedUploadUrl(path, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
