// app/api/spotify/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAppToken } from '../_lib/token';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ items: [] });

  const token = await getAppToken();

  const resp = await fetch(
    `https://api.spotify.com/v1/search?${new URLSearchParams({
      q,
      type: 'artist',
      limit: '10',
    })}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ error: text }, { status: resp.status });
  }

  const json = await resp.json();
  console.log('Spotify search response:', json);
  const items =
    (json?.artists?.items ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      genres: a.genres ?? [],
      image: a.images?.[0]?.url ?? null,
    })) ?? [];
  return NextResponse.json({ items });
}
