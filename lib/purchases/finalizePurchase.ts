// lib/purchases/finalizePurchase.ts
import { prisma } from "@/lib/prisma";

/**
 * Idempotently finalize a purchase:
 * - decrements tier stock
 * - creates tickets
 * - marks purchase as PAID
 */
export async function finalizePurchase(
  purchaseId: string,
  sessionId?: string | null,
  paymentId?: string | null
) {
  // Quick check to avoid work
  const existing = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!existing) return;
  if (existing.status === "PAID") return;

  await prisma.$transaction(async (tx) => {
    // Re-read inside the transaction to lock
    const p = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!p || p.status === "PAID") return;

    for (const it of p.items) {
      const tier = await tx.ticketTier.findUnique({
        where: { id: it.tierId },
        select: { id: true, eventId: true, quantity: true, priceCents: true, currency: true },
      });
      if (!tier) throw new Error("Tier missing");
      if (tier.eventId !== p.eventId) throw new Error("Tier/event mismatch");
      if ((tier.quantity ?? 0) < it.quantity) throw new Error("Tier sold out");

      // Decrement inventory
      await tx.ticketTier.update({
        where: { id: tier.id },
        data: { quantity: { decrement: it.quantity } },
      });

      // Issue tickets
      const ticketsData = Array.from({ length: it.quantity }).map(() => ({
        eventId: tier.eventId,
        ownerId: p.userId,
        price: it.unitPriceCents,
        currency: p.currency,
        tierId: tier.id,
        purchaseId: p.id,
        code: `TCKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, // dev-safe
      }));

      await tx.ticket.createMany({ data: ticketsData });
    }

    await tx.purchase.update({
      where: { id: p.id },
      data: {
        status: "PAID",
        stripeSessionId: sessionId ?? p.stripeSessionId,
        stripePaymentId: paymentId ?? p.stripePaymentId,
      },
    });
  });
}