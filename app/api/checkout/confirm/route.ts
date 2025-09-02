// app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { finalizePurchase } from "@/lib/purchases/finalizePurchase";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });
    }

    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (s.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "Payment not paid" }, { status: 409 });
    }

    const purchaseId = s.metadata?.purchaseId || null;
    if (!purchaseId) {
      return NextResponse.json({ ok: false, error: "Missing purchaseId" }, { status: 400 });
    }

    const paymentId =
      typeof s.payment_intent === "string"
        ? s.payment_intent
        : s.payment_intent?.id || null;

    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      return NextResponse.json({ ok: false, error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status !== "PAID") {
      await finalizePurchase(purchaseId, s.id, paymentId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[checkout/confirm] error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Confirm failed" }, { status: 500 });
  }
}
