import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import VerifyClient from "@/components/host/VerifyClient"

export default async function VerifyPage() {
  const { ok } = await requireRole(["HOST", "ADMIN"]);
  if (!ok) redirect("/");
  return <VerifyClient />;
}