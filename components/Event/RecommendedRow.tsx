"use client";
import { useEffect, useState } from "react";
import EventCard from "./EventCard";

export default function RecommendedRow() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/events/recommended?limit=10", { cache: "no-store" });
      const j = await res.json();
      setItems(j.items || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="mb-6"><span className="loading loading-dots loading-sm" /></div>;
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-3">Recommended for you</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map(ev => <EventCard key={ev.id} ev={ev} />)}
      </div>
    </section>
  );
}
