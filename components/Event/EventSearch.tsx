'use client';

import { faCalendar, faSearch, faX, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

type EventLite = {
  id: string;
  title: string;
  startAt: string;
  venueName: string;
  posterUrl?: string | null;
};

export default function EventSearch() {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<string>("");
  const [results, setResults] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // 🔎 fetch events
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    let active = true;
    setLoading(true);

    const controller = new AbortController();

    fetch(
      `/api/events/search?q=${encodeURIComponent(query)}${
        date ? `&date=${date}` : ""
      }`,
      { signal: controller.signal, cache: "no-store" }
    )
      .then((r) => r.json())
      .then((j) => {
        if (active && Array.isArray(j.items)) setResults(j.items);
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [query, date]);

  return (
    <div className={`dropdown w-full ${open ? "dropdown-open" : ""}`}>
      <summary className="join w-full">
        <label className="input join-item w-full focus-within:outline-none pr-0">
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            required
            placeholder="Search events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
            <button className="btn btn-sm btn-ghost btn-circle" onClick={() => { setQuery(""); setDate(""); }}>
            <FontAwesomeIcon icon={faXmark} />
            </button>
        </label>

        <label className="input w-auto join-item focus-within:outline-none">
          <FontAwesomeIcon icon={faCalendar} />
          <input
            type="date"
            className="input w-0 p-0 h-0 absolute focus-within:outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onFocus={(e) => e.target.showPicker()}
          />
        </label>
      </summary>

      {open && query.length > 1 &&(
        <ul className="menu flex-row dropdown-content bg-base-100 rounded-box z-10 w-72 p-2 shadow-sm max-h-72 overflow-auto">
          {loading && (
            <li className="disabled">
              <a>
                <span className="loading loading-spinner mr-2" />
                Searching…
              </a>
            </li>
          )}

          {!loading && results.length === 0 && query.length > 1 && (
            <li className="disabled"><a>No results</a></li>
          )}

          {!loading &&
            results.map((e) => (
              <li key={e.id}>
                <a href={`/events/${e.id}`} className="flex items-center gap-3">
                  {e.posterUrl ? (
                    <img
                      src={e.posterUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-base-200" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs opacity-70 truncate">
                      {new Date(e.startAt).toLocaleDateString()} — {e.venueName}
                    </div>
                  </div>
                </a>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
