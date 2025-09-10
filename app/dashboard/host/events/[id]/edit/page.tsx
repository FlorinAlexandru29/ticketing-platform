// app/dashboard/host/events/[id]/edit/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import EventEditor from "@/components/dashboard/EventEditor";

export const runtime = "nodejs";        // Prisma needs Node runtime
export const dynamic = "force-dynamic"; // always fetch fresh data

type Params = Promise<{ id: string }>;

export default async function HostEditEventPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const { userId, role, ok } = await requireRole(["HOST", "ADMIN"]);
  if (!ok || !userId) redirect("/");

  const ev = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      city: true,
      venueName: true,
      hostId: true,
      ticketTiers: {
        select: { id: true, category: true, priceCents: true, quantity: true},
        orderBy: { priceCents: "asc" },
      },
    },
  });
  

  if (!ev) redirect("/dashboard/host/events");
  if (role === "HOST" && ev.hostId !== userId) redirect("/dashboard/host/events");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Event</h1>
      <EventEditor
        eventId={ev.id}
        canDelete={role === "ADMIN" || ev.hostId === userId}
        
        initial={{
          title: ev.title,
          startAt: ev.startAt.toISOString(),
          endAt: ev.endAt ? ev.endAt.toISOString() : null,
          city: ev.city,
          venueName: ev.venueName,
          ticketTiers: ev.ticketTiers,
        }}
      />
    </div>
  );
}
