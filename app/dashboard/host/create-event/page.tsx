import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
// Reuse your existing CreateEventShell
import CreateEventShell from "@/app/create-event/Create-EventShell";

export default async function HostCreateEventPage() {
  const { ok } = await requireRole(["HOST","ADMIN"]);
  if (!ok) redirect("/");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Event</h1>
      {/* CreateEventShell is a client component already */}
      <CreateEventShell />
    </div>
  );
}
