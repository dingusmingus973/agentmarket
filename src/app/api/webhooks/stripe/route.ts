// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Stripe requires the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "charge.dispute.created":
        await handleDispute(event.data.object as Stripe.Dispute);
        break;

      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        // Unhandled — not an error, just ignore
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { listingId, buyerId, licenseType, amountPaid, platformFee, sellerPayout } =
    session.metadata ?? {};

  if (!listingId || !buyerId) {
    console.error("Missing metadata in checkout session", session.id);
    return;
  }

  // Prevent duplicate processing
  const existing = await prisma.purchase.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing) return;

  // Fetch listing for version locking
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error(`Listing ${listingId} not found`);

  await prisma.purchase.create({
    data: {
      buyerId,
      listingId,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      amountPaid: Number(amountPaid),
      platformFee: Number(platformFee),
      sellerPayout: Number(sellerPayout),
      licenseType: (licenseType as "PERSONAL" | "COMMERCIAL") ?? "PERSONAL",
      status: "COMPLETED",
      // Version lock — buyer always gets what they paid for
      lockedModel: listing.model,
      lockedSystemPrompt: listing.systemPrompt,
      lockedRequiredInputs: listing.requiredInputs,
    },
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: { purchaseCount: { increment: 1 } },
  });

  console.log(`Purchase created for listing ${listingId}, buyer ${buyerId}`);
}

async function handleDispute(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;
  if (!paymentIntentId) return;

  await prisma.purchase.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "DISPUTED" },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!paymentIntentId) return;

  await prisma.purchase.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
}
