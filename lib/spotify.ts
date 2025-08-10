// lib/spotify.ts
export async function getSpotifyProfile(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify /me failed: ${res.status}`);
  }
  return res.json() as Promise<{
    id: string;
    display_name: string | null;
    email?: string;
    product?: string; // free/premium
    country?: string;
    external_urls?: { spotify?: string };
    images?: { url: string }[];
  }>;
}
