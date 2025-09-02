"use client";
import { useEffect, useState } from "react";
import EventCard from "./EventCard";

export default function RecommendedRow({ hasSpotify }: { hasSpotify: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasSpotify) return; // only fetch for Spotify-linked accounts
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/events/recommended?limit=10", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        setItems(Array.isArray(j.items) ? j.items : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasSpotify]);

  if (!hasSpotify) return null;
  if (loading) return <div className="mb-6"><span className="loading loading-dots loading-sm" /></div>;
  if (items.length === 0) return null;

  return (
    <section className="mb-10 max-w-full">
      <h2 className="text-xl font-bold mb-3">Recommended for you</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map(ev => <EventCard key={ev.id} ev={ev} />)}
      </div>
    </section>
  );
}
