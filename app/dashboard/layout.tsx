export const runtime = "nodejs";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getUserAndRole } from "@/lib/authz";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getUserAndRole();

  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-base-300">
        <div className="mx-auto max-w-7xl px-2 py-6 grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-2">
          {/* Side nav */}
          <aside className="rounded-box bg-base-200 border border-base-300 p-2 h-max">
            <h2 className="text-sm opacity-70 mb-2 px-2">Dashboard</h2>
            <ul className="menu p-0">
              {(role === "HOST" || role === "ADMIN") && (
                <>
                  <li className="menu-title">Host</li>
                  <li><Link href="/dashboard/host/events">My Events</Link></li>
                  <li><Link href="/dashboard/host/create-event">Create Event</Link></li>
                </>
              )}
              {role === "ADMIN" && (
                <>
                  <li className="menu-title mt-2">Admin</li>
                  <li><Link href="/dashboard/admin/hosts">Approve Hosts</Link></li>
                  <li><Link href="/dashboard/admin/events">All Events</Link></li>
                  <li><Link href="/dashboard/admin/users">User Management</Link></li>
                </>
              )}
            </ul>
          </aside>

          {/* Content */}
          <section className="rounded-box bg-base-200 border border-base-300 p-4 min-h-[60vh]">
            {children}
          </section>
        </div>
      </main>
    </>
  );
}
