import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const PayloadSchema = z.object({
  eventId: z.string().min(1),
  items: z.array(
    z.object({
      tierId: z.string().min(1),
      quantity: z.number().int().min(1).max(20),
    })
  ).min(1),
});

function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export async function POST(req: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    const userId = (authSession?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const input = PayloadSchema.safeParse(body);
    if (!input.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: input.error.flatten() },
        { status: 400 }
      );
    }

    const { eventId, items } = input.data;

    // De-duplicate same tier in request (user may click + on same tier twice)
    const merged = new Map<string, number>();
    for (const it of items) {
      merged.set(it.tierId, (merged.get(it.tierId) ?? 0) + it.quantity);
    }
    const mergedItems = Array.from(merged.entries()).map(([tierId, quantity]) => ({ tierId, quantity }));

    // Load event + tiers
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, city: true, startAt: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const tiers = await prisma.ticketTier.findMany({
      where: { id: { in: mergedItems.map(i => i.tierId) } },
      select: { id: true, eventId: true, category: true, description: true, priceCents: true, currency: true, quantity: true },
    });
    if (tiers.length !== mergedItems.length) {
      return NextResponse.json({ error: "One or more tiers not found" }, { status: 400 });
    }
    // Validate tiers belong to event
    if (tiers.some(t => t.eventId !== eventId)) {
      return NextResponse.json({ error: "Tier/event mismatch" }, { status: 400 });
    }

    // Inventory check 
    for (const it of mergedItems) {
      const tier = tiers.find(t => t.id === it.tierId)!;
      if ((tier.quantity ?? 0) < it.quantity) {
        return NextResponse.json(
          { error: `Not enough inventory for ${tier.category}`, code: "OUT_OF_STOCK", tierId: tier.id },
          { status: 409 }
        );
      }
    }

    const currency = (tiers[0]?.currency || "RON").toLowerCase();
    // Ensure all tiers share same currency
    if (tiers.some(t => (t.currency || "RON").toLowerCase() !== currency)) {
      return NextResponse.json({ error: "Mixed currencies not supported" }, { status: 400 });
    }

    const totalCents = mergedItems.reduce((sum, it) => {
      const tier = tiers.find(t => t.id === it.tierId)!;
      return sum + tier.priceCents * it.quantity;
    }, 0);

    // Create pending purchase + items
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        eventId,
        currency: currency.toUpperCase(),
        totalCents,
        status: "PENDING",
        items: {
          create: mergedItems.map((it) => {
            const tier = tiers.find(t => t.id === it.tierId)!;
            return {
              tierId: tier.id,
              quantity: it.quantity,
              unitPriceCents: tier.priceCents,
            };
          }),
        },
      },
      select: { id: true },
    });

    const base = getBaseUrl();

    // Stripe line items
    const line_items = mergedItems.map((it) => {
      const tier = tiers.find(t => t.id === it.tierId)!;
      return {
        quantity: it.quantity,
        price_data: {
          currency,
          unit_amount: tier.priceCents,
          product_data: {
            name: `${event.title} — ${tier.category}`,
            description: tier.description || undefined,
            metadata: {
              eventId,
              tierId: tier.id,
            },
          },
        },
      };
    });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${base}/events/${eventId}?p=success&ps={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/events/${eventId}?p=cancel`,
      metadata: {
        purchaseId: purchase.id,
        userId,
        eventId,
      },
    });

    // store session id for correlation
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: stripeSession.id },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (e: any) {
    console.error("[checkout] error", e);
    return NextResponse.json({ error: e?.message || "Checkout failed" }, { status: 500 });
  }
}
