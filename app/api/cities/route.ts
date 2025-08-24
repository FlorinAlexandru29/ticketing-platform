// app/api/cities/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";        // ensure Node runtime
export const dynamic = "force-dynamic"; // don't cache route module in dev

const RAPID_HOST = "wft-geo-db.p.rapidapi.com";              // requires key
const FREE_HOST  = "geodb-free-service.wirefreethought.com"; // no key
const LIMIT      = 100;      // grab top 100 by population
const MIN_POP    = 1000;     // filter tiny places

function buildQuery(country: string) {
  return new URLSearchParams({
    countryIds: country,
    limit: String(LIMIT),
    sort: "-population",
    minPopulation: String(MIN_POP),
  }).toString();
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from upstream: ${text.slice(0, 200)}`);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = (url.searchParams.get("country") || "").toUpperCase().trim();

  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { error: "Provide ISO-3166 alpha-2 code (e.g. RO, US, DE)." },
      { status: 400 }
    );
  }

  const rapidKey = process.env.GEODB_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
  const hasRapid = Boolean(rapidKey);

  // 1) RapidAPI first (if configured)
  if (hasRapid) {
    try {
      const q = buildQuery(country);
      const rapidUrl = `https://${RAPID_HOST}/v1/geo/cities?${q}`;
      const json = await fetchJson(rapidUrl, {
        headers: {
          "X-RapidAPI-Key": rapidKey as string,
          "X-RapidAPI-Host": RAPID_HOST,
        },
      });
      const cities = ((json?.data as any[]) || [])
        .map((c) => c?.name)
        .filter(Boolean);
      console.log(`[cities] RapidAPI ok: ${country} -> ${cities.length} cities`);
      return NextResponse.json({
        cities: Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b)),
      });
    } catch (e) {
      console.error(`[cities] RapidAPI failed for ${country}:`, (e as Error)?.message);
      // fall through to free host
    }
  } else {
    console.warn("[cities] No GEODB_RAPIDAPI_KEY set; using free host");
  }

  // 2) Free host fallback (no key)
  try {
    const q = buildQuery(country);
    const freeUrl = `https://${FREE_HOST}/v1/geo/cities?${q}`;
    const json = await fetchJson(freeUrl);
    const cities = ((json?.data as any[]) || [])
      .map((c) => c?.name)
      .filter(Boolean);
    console.log(`[cities] Free host ok: ${country} -> ${cities.length} cities`);
    return NextResponse.json({
      cities: Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b)),
    });
  } catch (e) {
    console.error(`[cities] Free host failed for ${country}:`, (e as Error)?.message);
    // Final graceful return: never 502 to client
    return NextResponse.json(
      { cities: [], error: "GeoDB upstream error", detail: (e as Error)?.message ?? String(e) },
      { status: 200 }
    );
  }
}
