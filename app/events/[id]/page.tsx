// app/events/[id]/page.tsx
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import EventDetails from "./EventDetails";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from 'next-auth';

// v14/v15 params typing (v15 makes params a Promise)
type PageParams = { id: string };

export default async function EventPage({ params }: { params: Promise<PageParams> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      lineup: { include: { artist: true }, orderBy: { slot: "asc" } },
      ticketTiers: { orderBy: { priceCents: "asc" } },
    },
  });
  if (!event) notFound();

  const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined;
    //if (!userId) {
    //  redirect('/');
    //}
  
    // Hard check the user still exists (handles "deleted user but old JWT" case)
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

  // Build a serializable payload for the client component
  const payload = {
    id: event.id,
    title: event.title,
    posterUrl: event.posterUrl ?? null,
    eventType: event.eventType as "CONCERT" | "FESTIVAL",
    startAt: event.startAt.toISOString(),
    endAt: event.endAt ? event.endAt.toISOString() : null,
    description: event.description,
    venueName: event.venueName,
    city: event.city,
    country: event.country ?? null,
    venueAddress: event.venue?.address ?? "",
    lineup: event.lineup.map((l) => ({
      slot: l.slot.toISOString(),
      artist: {
        name: l.artist.name,
        image: l.artist.image ?? null,
        genres: (l.artist.genres ?? []) as string[],
      },
      artistId: l.artistId,
    })),
    ticketTiers: event.ticketTiers.map((t) => ({
      id: t.id,
      category: t.category,
      description: t.description,
      priceCents: t.priceCents,
      currency: t.currency || "RON",
      quantity: t.quantity,
      toBuy : 0
    })),
  };

  return (
    <>
      <Navbar />
      <main className="px-6 sm:px-8 md:px-12 py-8 justify-items-center bg-base-300">
        <div className="grid grid-cols-1 w-3/4 md:grid-cols-[auto] gap-6 items-start">
          <EventDetails event={payload} session={session as any}/>
        </div>
      </main>
    </>
  );
}
