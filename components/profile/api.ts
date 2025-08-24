'use client';

export type UpdatePayload = {
  name?: string;
  birthdate?: string | null;
  countryCode?: string | null;
  country?: string | null;
  city?: string | null;
};

export async function updateProfileField(payload: UpdatePayload) {
  const res = await fetch('/api/profile/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Update failed');
  return json as {
    ok: true;
    user: {
      name: string | null;
      birthdate: string | null;
      countryCode: string | null;
      country: string | null;
      city: string | null;
    };
  };
}
