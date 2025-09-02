import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import HostApprovals from "./table";

export default async function AdminHostsPage() {
  const { ok } = await requireRole(["ADMIN"]);
  if (!ok) redirect("/");

  const pending = await prisma.hostProfile.findMany({
    where: { verification: { in: ["PENDING", "REJECTED"] } },
    orderBy: { createdAt: "asc" },
    select: { userId: true, displayName:true, contactEmail:true, website:true, phone:true, verification:true,
      user: { select: { email: true, name: true } }
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approve Hosts</h1>
      <HostApprovals initial={pending} />
    </div>
  );
}
