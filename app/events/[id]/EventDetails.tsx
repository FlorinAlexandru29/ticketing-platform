"use client";

import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EventPayload = {
  id: string;
  title: string;
  posterUrl: string | null;
  eventType: "CONCERT" | "FESTIVAL";
  startAt: string;     // ISO
  endAt: string | null;
  description: string;
  venueName: string;
  city: string;
  country: string | null;
  venueAddress: string;
  lineup: Array<{
    slot: string;      // ISO
    artistId: string;
    artist: { name: string; image: string | null;};
  }>;
  ticketTiers: Array<{
    id: string;
    category: string;
    description: string;
    priceCents: number;
    currency: string;
    quantity: number;
    toBuy: number;
  }>;
};

type Props = {
  session: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      birthdate?: string | null;
      hasCredentials?: boolean;
      countryCode?: string | null;
      country?: string | null;
      city?: string | null;
      oauthProviders?: string[];
    };
  };
};

function fmtDateRange(startIso: string, endIso: string | null) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  if (!end || start.toDateString() === end.toDateString()) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
  

function buildMapsEmbed(venueName: string, address: string, city: string) {
  const q = [venueName, address, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}`;
}

export default function EventDetails({ event,session }: { event: EventPayload, session : Props }) {
  const router = useRouter();
  const search = useSearchParams();

  const when = useMemo(() => fmtDateRange(event.startAt, event.endAt), [event.startAt, event.endAt]);
  const mapUrl = useMemo(() => buildMapsEmbed(event.venueName, event.venueAddress, event.city), [
    event.venueName,
    event.venueAddress,
    event.city,
  ]);

  const userId = (session as any)?.user?.id as string | undefined;

  // Success flow (redirect from Stripe)
  const purchaseSuccess = search.get("p") === "success";
  const sessionId = search.get("ps");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!purchaseSuccess || !sessionId) return;
      try {
        // Best-effort confirm (webhook already issued tickets)
        const r = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok && !cancelled) {
          setConfirmErr(j?.error || "Could not confirm purchase");
        }
      } catch (e: any) {
        if (!cancelled) setConfirmErr(e?.message || "Could not confirm purchase");
      } finally {
        if (!cancelled) setConfirmed(true);
      }
    })();
    // Optional: auto-redirect to My Tickets after a short delay
    const to = setTimeout(() => {
      if (purchaseSuccess) router.push("/my-profile#tickets");
    }, 3500);
    return () => {
      cancelled = true;
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseSuccess, sessionId]);

  // --- Description height controls ---
  const [openDesc, setOpenDesc] = useState(false);

  // Ticket selection state
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(event.ticketTiers.map((t) => [t.id, 0]))
  );
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const items = event.ticketTiers
      .map((t) => ({ tier: t, q: qty[t.id] || 0 }))
      .filter((x) => x.q > 0);
    const totalCents = items.reduce((s, x) => s + x.tier.priceCents * x.q, 0);
    const totalCount = items.reduce((s, x) => s + x.q, 0);
    const categories = items.length;
    return { items, totalCents, totalCount, categories };
  }, [qty, event.ticketTiers]);

  async function startCheckout() {
    if (summary.totalCount === 0) return;
    setBuyLoading(true);
    setBuyError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          items: summary.items.map(x => ({ tierId: x.tier.id, quantity: x.q })),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j?.url) throw new Error(j?.error || "Failed to start checkout");
      window.location.href = j.url as string;
    } catch (e: any) {
      setBuyError(e?.message || "Failed to start checkout");
    } finally {
      setBuyLoading(false);
    }
  }

  return (
    <>
      {purchaseSuccess && (
        <div className={`alert ${confirmErr ? "alert-warning" : "alert-success"} mb-4`}>
          <span>
            Purchase successful! Your tickets are in{" "}
            <a className="link" href="/my-profile#tickets">
              My Tickets
            </a>
            . {confirmErr ? `(${confirmErr}) ` : ""}
            You’ll be redirected shortly…
          </span>
        </div>
      )}

      {/* Poster + Header row */}
      <div className="flex gap-4 w-full flex-col md:flex-row">
        <div className="rounded-box border border-base-300 min-h-full sm:max-h-full md:max-h-130 bg-base-200 max-w-none min-w-none sm:min-w-86 sm:max-w-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.posterUrl ?? "/placeholder.jpg"} alt={event.title} className="w-full h-full" />
        </div>

        <div className="flex h-full w-full items-start justify-between gap-4">
          <div className="flex wrap flex-col h-full gap-2 w-full">
            <h1 className="text-3xl font-bold mb-1">{event.title}</h1>
            <div className="badge badge-primary mr-2">
              {event.eventType === "CONCERT" ? "Concert" : "Festival"}
            </div>
            <span className="opacity-70">{when}</span>
            <div className="opacity-70">
              {event.venueName} • {event.city}
              {event.country ? `, ${event.country}` : ""}
            </div>

            {event.lineup.length > 0 && (
              <div className="rounded-box border border-base-300 bg-base-200 p-4 w-full">
                <h2 className="font-semibold mb-3">Lineup</h2>
                <ul className="divide-y divide-base-300">
                  {event.lineup.map((l) => (
                    <li key={l.artistId} className="py-2 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={l.artist.image ?? "/placeholder.jpg"}
                        alt={l.artist.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{l.artist.name}</div>
                      </div>
                      <div className="text-sm opacity-80">
                        {new Intl.DateTimeFormat(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(l.slot))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 mt-2 w-full">
        {/* Details */}
        <section className="rounded-box border border-base-300 bg-base-200 p-4">
          <h2 className="font-semibold mb-3">Event Details</h2>
          <div
            className={`prose max-w-none rounded-box bg-base-100 p-4 transition-all duration-300 ease-in-out ${
              openDesc ? "max-h-[600px] overflow-y-auto" : "max-h-64 overflow-y-hidden"
            }`}
          >
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>
          <button className="link link-active mt-2" onClick={() => setOpenDesc(!openDesc)}>
            {openDesc ? "Less Details" : "More Details"}
          </button>
        </section>

        {/* Tickets */}
        {event.ticketTiers.length > 0 && (
          <section className="rounded-box border border-base-300 bg-base-200 p-4 space-y-2">
            <h2 className="font-semibold">Buy Tickets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {event.ticketTiers.map((t) => {
                const q = qty[t.id] || 0;
                const priceStr = (t.priceCents / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: t.currency || "RON",
                });
                return (
                  <div key={t.id} className="card bg-base-100 border border-base-300">
                    <div className="card-body p-4">
                      <h3 className="font-semibold">{t.category}</h3>
                      <p className="text-sm opacity-80">{t.description}</p>
                      <div className="mt-2 font-bold">{priceStr}</div>
                      <div className="text-xs opacity-70">Available: {t.quantity}</div>

                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mt-2">
                        <button
                          className="btn btn-circle btn-success"
                          onClick={() =>
                            setQty((prev) => ({ ...prev, [t.id]: Math.min(t.quantity, (prev[t.id] || 0) + 1) }))
                          }
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                        <p className="text-center font-semibold">{q}</p>
                        <button
                          className="btn btn-circle btn-success"
                          onClick={() =>
                            setQty((prev) => ({ ...prev, [t.id]: Math.max(0, (prev[t.id] || 0) - 1) }))
                          }
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary + Purchase */}
            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm opacity-80">
                {summary.totalCount > 0 ? (
                  <>
                    <strong>{summary.totalCount}</strong> ticket{summary.totalCount > 1 ? "s" : ""} across{" "}
                    <strong>{summary.categories}</strong> categor{summary.categories === 1 ? "y" : "ies"} —{" "}
                    <strong>
                      {(summary.totalCents / 100).toLocaleString(undefined, { style: "currency", currency: "RON" })}
                    </strong>
                  </>
                ) : (
                  <>Select tickets to continue</>
                )}
              </div>
              <div className="flex items-center gap-3">
                {buyError && <div className="text-error text-sm">{buyError}</div>}
                <button className="btn btn-primary" disabled={summary.totalCount === 0 || buyLoading || !userId} 
                onClick={() => 
                (
                  startCheckout()
                )}>
                  {!userId ? "Log in to Purchase" :( buyLoading ? <span className="loading loading-spinner" /> : "Purchase" )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Map */}
        <section className="rounded-box border border-base-300 bg-base-200 p-3">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-base-300">
            <iframe src={mapUrl} className="w-full h-full" loading="lazy" />
          </div>
        </section>
      </div>
    </>
  );
}
