import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export default async function AdminEventsPage() {
  const { ok } = await requireRole(["ADMIN"]);
  if (!ok) redirect("/");

  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    select: {
      id:true, title:true, startAt:true, city:true, venueName:true, eventType:true,
      host: { select: { email:true } }
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All Events</h1>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr><th>Title</th><th>Date</th><th>City</th><th>Venue</th><th>Host Email</th><th></th></tr>
          </thead>
          <tbody>
            {events.map(ev=>(
              <tr key={ev.id}>
                <td className="font-medium">{ev.title}</td>
                <td>{new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(ev.startAt)}</td>
                <td>{ev.city}</td>
                <td>{ev.venueName}</td>
                <td className="text-sm opacity-70">{ev.host?.email ?? "—"}</td>
                <td className="flex gap-2">
                  <Link className="btn btn-xs" href={`/events/${ev.id}`}>View</Link>
                  <Link className="btn btn-xs btn-secondary" href={`/dashboard/admin/events/${ev.id}/edit`}>Edit</Link>
                </td>
              </tr>
            ))}
            {events.length===0 && <tr><td colSpan={6}><div className="alert alert-info">No events.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
