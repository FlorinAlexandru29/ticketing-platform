// components/EventRow.tsx
"use client";
import { useEffect, useState } from "react";
import EventCard from "./EventCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faRotateRight } from "@fortawesome/free-solid-svg-icons";

type RowType = "CONCERT" | "FESTIVAL";

type ApiEvent = {
  id: string;
  title: string;
  posterUrl: string | null;
  startAt: string;
  endAt: string | null;
  city: string;
  country: string | null;
  eventType: RowType;
  venueName: string;
};

export default function EventRow({
  heading,
  type,
  pageSize = 10,
}: {
  heading: string;
  type: RowType;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ApiEvent[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(p = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/events?type=${type}&page=${p}&pageSize=${pageSize}&upcoming=true`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to load");
      setItems(data.items || []);
      setHasNext(Boolean(data.hasNext));
      setPage(p);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setItems([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-bold">{heading}</h2>
        {loading ? (
          <span className="loading loading-dots loading-sm" />
        ) : error ? (
          <button className="btn btn-ghost btn-xs" onClick={() => load(page)}>
            <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
            Retry
          </button>
        ) : null}
      </div>

      {!loading && !error && items.length === 0 && (
        <div className="text-sm opacity-70">No {heading} found</div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((ev) => (
          <EventCard key={ev.id} ev={ev} />
        ))}

        {/* Next page tile */}
        {items.length > 0 && (
          <button
            className="w-56 min-w-56 h-40 self-center rounded-box border border-dashed border-base-300 bg-base-200 hover:bg-base-300 flex items-center justify-center shrink-0"
            onClick={() => hasNext && load(page + 1)}
            disabled={!hasNext || loading}
            aria-label="Load next page"
          >
            <div className="text-center">
              <FontAwesomeIcon icon={faChevronRight} className="text-2xl mb-1" />
              <div className="text-xs opacity-70">{hasNext ? "Next page" : "No more"}</div>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
