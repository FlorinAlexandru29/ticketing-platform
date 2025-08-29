// app/api/spotify/_lib/token.ts
import { NextResponse } from 'next/server';

let cached:
  | { accessToken: string; expiresAt: number }
  | null = null;

export async function getAppToken() {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing SPOTIFY_CLIENT_ID/SECRET');
  }

  const now = Date.now();
  if (cached && now < cached.expiresAt - 60_000) {
    return cached.accessToken; // reuse until 60s before expiry
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    // Important: this runs on the server only
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cached = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cached.accessToken;
}
