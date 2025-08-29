import { NextRequest, NextResponse } from 'next/server';
import { getAppToken } from '../_lib/token';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ items: [] });

  const token = await getAppToken();

  const resp = await fetch(
    `https://api.spotify.com/v1/artists/${q}/albums?limit=5`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ error: text }, { status: resp.status });
  }

  const json = await resp.json();
  const items =
    (json?.items ?? []).map((a: any) => ({
      name: a.name,
      release_date: a.release_date,
    })) ?? [];

  return NextResponse.json({ items });
}