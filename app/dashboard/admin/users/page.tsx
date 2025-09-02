import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import UsersClient from "./users-client";

export default async function AdminUsersPage() {
  const { ok } = await requireRole(["ADMIN"]);
  if (!ok) redirect("/");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      <UsersClient />
    </div>
  );
}
