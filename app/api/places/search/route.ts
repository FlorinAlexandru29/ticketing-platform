// app/api/places/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(req: NextRequest) {
  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);

  // Query pieces
  const q = (searchParams.get('q') || '').trim();
  const city = (searchParams.get('city') || '').trim();
  const country = (searchParams.get('country') || '').trim();

  // Optional filters
  const countryCode = (searchParams.get('countryCode') || '').trim(); // ISO 3166-1 alpha-2 (e.g., "RO", "US")
  const limitParam = Number(searchParams.get('limit') || '8');

  // Basic guards
  if (q.length < 2) return NextResponse.json({ places: [] });

  // Build a single text query with city/country constraints if present
  const textQuery = [q, city, country].filter(Boolean).join(', ');

  // Build request body for Places API (New)
  const body: Record<string, any> = {
    textQuery,
    pageSize: Math.min(Math.max(1, limitParam || 8), 20), // 1..20
    languageCode: 'en',
  };

  if (countryCode.length === 2) body.regionCode = countryCode.toUpperCase();

  // Ask only for the fields we need
  const FIELD_MASK =
    'places.id,places.displayName,places.formattedAddress,places.location';

  try {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      const message = data?.error?.message || JSON.stringify(data).slice(0, 600);
      return NextResponse.json(
        { error: `Places API error ${resp.status}: ${message}` },
        { status: 500 }
      );
    }

    const raw: any[] = Array.isArray(data?.places) ? data.places : [];

    // Deduplicate by place id (e.g., "Quantic" vs "Quantic Pub" mapping to same place)
    const seen = new Set<string>();
    const places = raw
      .filter((p) => {
        const id = p?.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? '',
        address: p.formattedAddress ?? '',
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
      }));

    return NextResponse.json({ places });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Places API call failed: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
