export const runtime = "nodejs";
import { redirect } from "next/navigation";
import { getUserAndRole } from "@/lib/authz";

export default async function DashboardHome() {
  const { role } = await getUserAndRole();
  if (role === "ADMIN") redirect("/dashboard/admin/hosts");
  if (role === "HOST") redirect("/dashboard/host/events");
  redirect("/"); // not allowed
}
