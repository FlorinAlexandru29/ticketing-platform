// app/api/events/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

export const runtime = "nodejs";        // Prisma requires Node runtime
export const dynamic = "force-dynamic"; // avoid accidental edge/static

type Params = Promise<{ id: string }>;

const PatchSchema = z.object({
  title: z.string().min(2).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  city: z.string().min(1).optional(),
  venueName: z.string().min(1).optional(),
  ticketTiers: z.array(z.object({
    id: z.string(),
    priceCents: z.number().int().nonnegative(),
    quantity: z.number().int().nonnegative(),
  })).optional(),
});

async function canEdit(eventId: string) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const };

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role === "ADMIN") return { ok: true as const, admin: true, userId };
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { hostId: true } });
  if (ev?.hostId === userId) return { ok: true as const, admin: false, userId };
  return { ok: false as const };
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ev);
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const auth = await canEdit(id);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const input = PatchSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (input.data.title) data.title = input.data.title;
  if (input.data.startAt) data.startAt = new Date(input.data.startAt);
  if (input.data.endAt !== undefined) data.endAt = input.data.endAt ? new Date(input.data.endAt) : null;
  if (input.data.city) data.city = input.data.city;
  if (input.data.venueName) data.venueName = input.data.venueName;

  try {
    await prisma.$transaction(async (tx) => {
      // Update event core fields
      if (Object.keys(data).length) {
        await tx.event.update({ where: { id }, data });
      }

      // Update ticket tiers (only price & quantity; quantity can only go up)
      if (input.data.ticketTiers) {
        const existing = await tx.ticketTier.findMany({
          where: { eventId: id },
          select: { id: true, quantity: true },
        });
        const map = new Map(existing.map(e => [e.id, e.quantity]));
        for (const t of input.data.ticketTiers) {
          const curQ = map.get(t.id);
          if (curQ == null) continue;
          if (t.quantity < curQ) {
            // enforce "no lowering quantity" → only apply price
            await tx.ticketTier.update({
              where: { id: t.id },
              data: { priceCents: t.priceCents },
            });
          } else {
            await tx.ticketTier.update({
              where: { id: t.id },
              data: { priceCents: t.priceCents, quantity: t.quantity },
            });
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const auth = await canEdit(id);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
