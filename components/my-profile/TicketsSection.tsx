"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ticket = {
  id: string;
  code: string;
  price: number;
  currency: string;
  validatedAt: string | null;
  tier: { id: string; category: string; description: string | null };
};

type EventGroup = {
  event: {
    id: string;
    title: string;
    startAt: string;
    venueName: string;
    city: string;
    country: string | null;
    posterUrl: string | null;
  };
  tickets: Ticket[];
};

export default function TicketsSection() {
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/my/tickets", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load tickets");
        if (alive) setGroups(Array.isArray(j.groups) ? j.groups : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load tickets");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section id="tickets" className="rounded-2xl border shadow-sm p-5">
        <h3 className="text-base font-semibold">Tickets</h3>
        <div className="mt-2">
          <span className="loading loading-dots" />
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section id="tickets" className="rounded-2xl border shadow-sm p-5">
        <h3 className="text-base font-semibold">Tickets</h3>
        <p className="mt-2 text-sm text-error">{err}</p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section id="tickets" className="rounded-2xl border shadow-sm p-5">
        <h3 className="text-base font-semibold">Tickets</h3>
        <p className="mt-2 text-sm opacity-80">You don’t have any tickets yet.</p>
      </section>
    );
  }

  return (
    <section id="tickets" className="rounded-2xl border shadow-sm p-5">
      <h3 className="text-base font-semibold mb-3">Tickets</h3>

      <div className="space-y-3">
        {groups.map((g) => {
          const dateText = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
            new Date(g.event.startAt)
          );
          return (
            <div key={g.event.id} className="collapse collapse-arrow bg-base-100 border border-base-300">
              <input type="checkbox" />
              <div className="collapse-title flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.event.posterUrl ?? "/placeholder.jpg"}
                  alt={g.event.title}
                  className="w-16 h-16 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{g.event.title}</div>
                  <div className="text-xs opacity-70 truncate">
                    {dateText} • {g.event.venueName} • {g.event.city}
                    {g.event.country ? `, ${g.event.country}` : ""}
                  </div>
                </div>
                <span className="badge badge-primary">{g.tickets.length} ticket{g.tickets.length > 1 ? "s" : ""}</span>
              </div>

              <div className="collapse-content">
                <ul className="divide-y divide-base-300">
                  {g.tickets.map((t) => (
                    <li key={t.id} className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {t.tier?.category ?? "-"} —{" "}
                          {(t.price / 100).toLocaleString(undefined, {
                            style: "currency",
                            currency: t.currency,
                          })}
                        </div>
                        <div className="text-xs opacity-70 break-all">
                          Code: <span className="font-mono">{t.code}</span>
                        </div>
                        {t.validatedAt ? (
                          <div className="text-xs text-success">Validated on {new Date(t.validatedAt).toLocaleString()}</div>
                        ) : (
                          <div className="text-xs opacity-60">Not validated yet</div>
                        )}
                      </div>
                      <a
                        className="btn btn-outline btn-sm"
                        href={`/api/tickets/${t.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download PDF
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Link className="btn btn-ghost btn-sm" href={`/events/${g.event.id}`}>
                    View event
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
