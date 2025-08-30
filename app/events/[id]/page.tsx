import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

// ✅ v14 + v15 compatible helper
type MaybePromise<T> = T | Promise<T>;
type PageParams = { id: string };

function fmtDateRange(start: Date, end?: Date | null) {
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  if (!end || start.toDateString() === end.toDateString()) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function buildMapsEmbed(venueName: string, address: string, city: string) {
  const q = [venueName, address, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}`;
}

// 👇 note the type and the await
export default async function EventPage({
  params,
}: {
  params: MaybePromise<PageParams>;
}) {
  const { id } = await Promise.resolve(params);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      lineup: { include: { artist: true }, orderBy: { slot: "asc" } },
      ticketTiers: { orderBy: { priceCents: "asc" } },
    },
  });
  if (!event) notFound();

  const when = fmtDateRange(event.startAt, event.endAt ?? undefined);
  const mapUrl = buildMapsEmbed(event.venueName, event.venue?.address ?? "", event.city);


  return (
    <>
      <Navbar />
      <main className="px-6 sm:px-8 md:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Poster */}
          <div className="rounded-box overflow-hidden border border-base-300 bg-base-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.posterUrl ?? "/placeholder.jpg"}
              alt={event.title}
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Primary info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">{event.title}</h1>
                <div className="badge badge-primary mr-2">
                  {event.eventType === "CONCERT" ? "Concert" : "Festival"}
                </div>
                <span className="opacity-70">{when}</span>
                <div className="opacity-70">{event.venueName} • {event.city}{event.country ? `, ${event.country}` : ""}</div>
              </div>
            </div>

            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Lineup */}
            {event.lineup.length > 0 && (
              <section className="rounded-box border border-base-300 bg-base-200 p-4">
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
                        <div className="text-xs opacity-70 truncate">{(l.artist.genres || []).slice(0,3).join(", ")}</div>
                      </div>
                      <div className="text-sm opacity-80">
                        {new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(l.slot))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tickets */}
            {event.ticketTiers.length > 0 && (
              <section className="rounded-box border border-base-300 bg-base-200 p-4">
                <h2 className="font-semibold mb-3">Tickets</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {event.ticketTiers.map((t) => (
                    <div key={t.id} className="card bg-base-100 border border-base-300">
                      <div className="card-body p-4">
                        <h3 className="font-semibold">{t.category}</h3>
                        <p className="text-sm opacity-80">{t.description}</p>
                        <div className="mt-2 font-bold">
                          {(t.priceCents / 100).toLocaleString(undefined, { style: "currency", currency: t.currency || "RON" })}
                        </div>
                        <div className="text-xs opacity-70">Qty: {t.quantity}</div>
                      </div>
                    </div>
                  ))}
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
        </div>
      </main>
    </>
  );
}
