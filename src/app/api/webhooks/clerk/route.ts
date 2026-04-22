// src/app/api/webhooks/clerk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(payload, headers) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address;

    if (!primaryEmail) return NextResponse.json({ received: true });

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await prisma.user.upsert({
      where: { clerkId: data.id },
      update: {
        email: primaryEmail,
        name,
        avatarUrl: data.image_url ?? null,
      },
      create: {
        clerkId: data.id,
        email: primaryEmail,
        name,
        avatarUrl: data.image_url ?? null,
      },
    });
  }

  if (type === "user.deleted") {
    await prisma.user.updateMany({
      where: { clerkId: data.id },
      data: { email: `deleted-${data.id}@deleted.com`, name: "Deleted User" },
    });
  }

  return NextResponse.json({ received: true });
}
