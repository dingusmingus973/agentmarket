// src/app/api/sellers/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Create Stripe Connect Express account if not exists
  let connectId = user.stripeConnectId;
  if (!connectId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { userId: user.id },
    });

    connectId = account.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeConnectId: connectId, isSeller: true },
    });
  }

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${appUrl}/sell/connect?refresh=true`,
    return_url: `${appUrl}/sell/connected`,
    type: "account_onboarding",
  });

  return NextResponse.json({ success: true, data: { onboardingUrl: accountLink.url } });
}

// GET — check connect status
export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user?.stripeConnectId) {
    return NextResponse.json({ success: true, data: { connected: false } });
  }

  const account = await stripe.accounts.retrieve(user.stripeConnectId);
  const connected = account.details_submitted && account.charges_enabled;

  return NextResponse.json({ success: true, data: { connected, accountId: account.id } });
}
