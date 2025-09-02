import Navbar from "@/components/Navbar";
import HostApplyForm from "./HostApplyForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HostApplyPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  const host = userId ? await prisma.hostProfile.findUnique({ where: { userId } }) : null;

  return (
    <>
      <Navbar />
      <main className="px-6 sm:px-8 md:px-12 py-8 bg-base-300 min-h-dvh">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Become an Event Host</h1>
          <p className="opacity-70 mb-6">Apply to create and manage events on StageList.</p>

          {!userId ? (
            <div className="alert alert-info">
              <span>Please <Link className="link" href="/login">log in</Link> to apply.</span>
            </div>
          ) : host?.verification === "APPROVED" ? (
            <div className="alert alert-success">
              <span>You are approved as a host. Go to your <Link className="link" href="/dashboard">Dashboard</Link>.</span>
            </div>
          ) : (
            <HostApplyForm existing={host ? {
              displayName: host.displayName,
              website: host.website || "",
              contactEmail: host.contactEmail || "",
              phone: host.phone || "",
              verification: host.verification
            } : null} />
          )}
        </div>
      </main>
    </>
  );
}
