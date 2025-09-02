// app/dashboard/admin/events/[id]/edit/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import EventEditor from "@/components/dashboard/EventEditor";

export const runtime = "nodejs";        // keep Prisma on Node
export const dynamic = "force-dynamic"; // always fetch fresh data

type Params = Promise<{ id: string }>;

export default async function AdminEditEventPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const { ok } = await requireRole(["ADMIN"]);
  if (!ok) redirect("/");

  const ev = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      city: true,
      venueName: true,
      ticketTiers: {
        select: { id: true, category: true, priceCents: true, quantity: true },
        orderBy: { priceCents: "asc" },
      },
    },
  });

  if (!ev) redirect("/dashboard/admin/events");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Event (Admin)</h1>
      <EventEditor
        eventId={ev.id}
        canDelete
        afterSavePath="/dashboard/admin/events"
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
