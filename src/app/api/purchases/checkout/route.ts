export const dynamic = "force-dynamic";
// src/app/api/purchases/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe, platformFee, sellerPayout } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  listingId: z.string(),
  licenseType: z.enum(["PERSONAL", "COMMERCIAL"]).default("PERSONAL"),
});

const COMMERCIAL_SURCHARGE_CENTS = 1000; // +$10 for commercial license

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to purchase" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { listingId, licenseType } = parsed.data;

  // Get listing
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "APPROVED" },
    include: { seller: true },
  });
  if (!listing) {
    return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
  }

  // Free listings — create purchase directly, no Stripe needed
  if (listing.priceUsd === 0 && listing.pricingModel === "FREE") {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Check for existing purchase
    const existing = await prisma.purchase.findFirst({
      where: { buyerId: user.id, listingId, status: "COMPLETED" },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: { purchaseId: existing.id, free: true } });
    }

    const purchase = await prisma.purchase.create({
      data: {
        buyerId: user.id,
        listingId,
        amountPaid: 0,
        platformFee: 0,
        sellerPayout: 0,
        licenseType,
        status: "COMPLETED",
        lockedModel: listing.model,
        lockedSystemPrompt: listing.systemPrompt,
        lockedRequiredInputs: listing.requiredInputs,
      },
    });

    await prisma.listing.update({
      where: { id: listingId },
      data: { purchaseCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, data: { purchaseId: purchase.id, free: true } });
  }

  // Paid listings — Stripe Checkout
  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email: `${userId}@placeholder.com` }, // email updated via Clerk webhook
  });

  // Calculate amount
  const baseAmount = listing.priceUsd;
  const licenseAddon = licenseType === "COMMERCIAL" ? COMMERCIAL_SURCHARGE_CENTS : 0;
  const totalAmount = baseAmount + licenseAddon;
  const fee = platformFee(totalAmount);
  const payout = sellerPayout(totalAmount);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: totalAmount,
          product_data: {
            name: listing.name,
            description: `${listing.shortDesc} — ${licenseType.toLowerCase()} license`,
          },
        },
        quantity: 1,
      },
    ],
    // Transfer to seller's connected account after deducting platform fee
    payment_intent_data: listing.seller.stripeConnectId
      ? {
          application_fee_amount: fee,
          transfer_data: {
            destination: listing.seller.stripeConnectId,
          },
        }
      : undefined,
    metadata: {
      listingId,
      buyerId: user.id,
      licenseType,
      amountPaid: totalAmount,
      platformFee: fee,
      sellerPayout: payout,
    },
    success_url: `${appUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/agent/${listing.slug}?cancelled=true`,
    customer_email: user.email,
  });

  return NextResponse.json({ success: true, data: { checkoutUrl: session.url } });
}
