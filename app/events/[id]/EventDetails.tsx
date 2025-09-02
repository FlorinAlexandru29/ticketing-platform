"use client";

import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
    artist: { name: string; image: string | null; genres: string[] };
  }>;
  ticketTiers: Array<{
    id: string;
    category: string;
    description: string;
    priceCents: number;
    currency: string;
    quantity: number;
    toBuy : number;
  }>;
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

export default function EventDetails({ event }: { event: EventPayload }) {
  const when = useMemo(() => fmtDateRange(event.startAt, event.endAt), [event.startAt, event.endAt]);
  const mapUrl = useMemo(() => buildMapsEmbed(event.venueName, event.venueAddress, event.city), [
    event.venueName,
    event.venueAddress,
    event.city,
  ]);

  // --- Description height controls ---
  // Using a numeric max-height (px) so you can “grow/shrink” with +/- buttons
  const [openDesc, setOpenDesc] = useState(false);

  return (
    <>
      {/* Poster + Header row */}
      <div className="flex gap-4 w-full flex-col md:flex-row">
        <div className="rounded-box border border-base-300 min-h-full max-h-130 bg-base-200 max-w-none min-w-none sm:min-w-86 sm:max-w-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.posterUrl ?? "/placeholder.jpg"}
            alt={event.title}
            className="w-full h-full"
          />
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
                        <div className="text-xs opacity-70 truncate">
                          {(l.artist.genres || []).slice(0, 3).join(", ")}
                        </div>
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

      {/* Body sections */}
      <div className="space-y-4 mt-2 w-full">
        {/* Description with adjustable height */}
        <section className="rounded-box border border-base-300 bg-base-200 p-4">
          <h2 className="font-semibold mb-3">Event Details</h2>
          <div
            className={`prose max-w-none rounded-box bg-base-100 p-4  
              transition-all duration-300 ease-in-out
              ${openDesc ? 'max-h-[600px] overflow-y-auto' : 'max-h-64 overflow-y-hidden'}`}
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
              {event.ticketTiers.map((t) => (
                <div key={t.id} className="card bg-base-100 border border-base-300">
                  <div className="card-body p-4">
                    <h3 className="font-semibold">{t.category}</h3>
                    <p className="text-sm opacity-80">{t.description}</p>
                    <div className="mt-2 font-bold">
                      {(t.priceCents / 100).toLocaleString(undefined, {
                        style: "currency",
                        currency: t.currency || "RON",
                      })}
                    </div>
                    <div className="text-xs opacity-70">Qty: {t.quantity}</div>
                    <div className="grid grid-cols-[1fr_1fr_1fr] items-center justify-items-center">
                    <button className="btn btn-circle btn-success" onClick={() => t.toBuy+1}><FontAwesomeIcon icon={faPlus}/></button>
                    <p>{t.toBuy}</p>
                    <button className="btn btn-circle btn-success" onClick={() => t.toBuy-1}><FontAwesomeIcon icon={faMinus}/></button>
                    </div>
                  </div>
                  
                  
                </div>
              
              ))}
            </div>
            <button className="btn btn-primary"> Purchase </button>
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
