import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  eventId: z.string().min(1),
  code: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, code } = Body.parse(await req.json());

  // Ensure caller is the host for this event (or admin)
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const isAdmin = (session as any)?.user?.role === "ADMIN";
  if (event.hostId !== userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Allow scanning either ticket.code or ticket.id
  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ code: code.trim() }, { id: code.trim() }],
    },
    select: {
      id: true,
      eventId: true,
      validatedAt: true,
      tier: { select: { category: true } }, // ⬅️ pull category
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { status: "not_found", message: "Ticket does not exist." },
      { status: 200 }
    );
  }

  if (ticket.eventId !== eventId) {
    return NextResponse.json(
      { status: "wrong_event", message: "Ticket not valid for this event." },
      { status: 200 }
    );
  }

  if (ticket.validatedAt) {
    return NextResponse.json(
      {
        status: "already",
        message: "Ticket was already validated.",
        category: ticket.tier?.category ?? null, // ⬅️ include for display at door
      },
      { status: 200 }
    );
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { validatedAt: new Date() },
  });

  return NextResponse.json(
    {
      status: "validated",
      message: "Ticket was validated.",
      category: ticket.tier?.category ?? null, // ⬅️ include for display at door
    },
    { status: 200 }
  );
}
