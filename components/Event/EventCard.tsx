// components/EventCard.tsx
"use client";
import Link from "next/link";

type EventLite = {
  id: string;
  title: string;
  posterUrl: string | null;
  startAt: string | Date;
  city: string;
  country: string | null;
  eventType: "CONCERT" | "FESTIVAL";
  venueName: string;
};

function fmtDate(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: undefined }).format(dt);
}

export default function EventCard({ ev }: { ev: EventLite }) {
  return (
    <Link
      href={`/events/${ev.id}`}
      className="group w-56 min-w-56 rounded-box overflow-hidden border border-base-300 bg-base-200 hover:bg-base-300 transition-colors duration-200"
    >
      <div className="relative h-40 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ev.posterUrl ?? "/placeholder.jpg"}
          alt={ev.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute left-2 top-2 badge badge-primary">
          {ev.eventType === "CONCERT" ? "Concert" : "Festival"}
        </span>
      </div>
      <div className="p-3 text-left">
        <h3 className="font-semibold line-clamp-2">{ev.title}</h3>
        <p className="text-xs opacity-70 mt-1">{fmtDate(ev.startAt)}</p>
        <p className="text-xs opacity-70">{ev.venueName}</p>
        <p className="text-xs opacity-70">{ev.city}{ev.country ? `, ${ev.country}` : ""}</p>
      </div>
    </Link>
  );
}
