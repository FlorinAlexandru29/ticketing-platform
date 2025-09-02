import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export default async function HostEventsPage() {
  const { userId, ok } = await requireRole(["HOST","ADMIN"]);
  if (!ok || !userId) redirect("/");

  const events = await prisma.event.findMany({
    where: { hostId: userId },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true, startAt: true, city: true, venueName: true, posterUrl: true, eventType: true }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Link href="/dashboard/host/create-event" className="btn btn-primary">Create Event</Link>
      </div>

      {events.length === 0 ? (
        <div className="alert alert-info">You have no events yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(ev => (
            <div key={ev.id} className="card bg-base-100 border border-base-300">
              <figure className="aspect-[16/9] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ev.posterUrl ?? "/placeholder.jpg"} alt={ev.title} className="w-full h-full object-cover"/>
              </figure>
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold line-clamp-1">{ev.title}</h3>
                  <span className="badge badge-primary">{ev.eventType === "CONCERT" ? "Concert" : "Festival"}</span>
                </div>
                <div className="text-sm opacity-70">{ev.venueName} • {ev.city}</div>
                <div className="text-sm opacity-70">
                  {new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(ev.startAt)}
                </div>
                <div className="card-actions justify-end mt-2">
                  <Link className="btn btn-sm" href={`/events/${ev.id}`}>View</Link>
                  <Link className="btn btn-sm btn-secondary" href={`/dashboard/host/events/${ev.id}/edit`}>Edit</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
