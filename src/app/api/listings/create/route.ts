// src/app/api/listings/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AgentCategory, PricingModel } from "@prisma/client";

const schema = z.object({
  name: z.string().min(3).max(80),
  shortDesc: z.string().min(10).max(200),
  fullDesc: z.string().min(50).max(5000),
  category: z.nativeEnum(AgentCategory),
  tags: z.array(z.string()).min(1).max(8),
  iconEmoji: z.string().optional().default("🤖"),
  iconBg: z.string().optional().default("#E1F5EE"),
  model: z.enum([
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-haiku-4-5-20251001",
    "gpt-4o",
    "gpt-4o-mini",
  ]),
  systemPrompt: z.string().min(50).max(10000),
  requiredInputs: z.array(z.string()).min(1).max(10),
  exampleOutput: z.string().min(20).max(5000),
  pricingModel: z.nativeEnum(PricingModel),
  priceUsd: z.number().min(0).max(999), // dollars
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get or create user
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const data = parsed.data;

  // Generate a unique slug
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.listing.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const listing = await prisma.listing.create({
    data: {
      sellerId: user.id,
      name: data.name,
      slug,
      shortDesc: data.shortDesc,
      fullDesc: data.fullDesc,
      category: data.category,
      tags: data.tags,
      iconEmoji: data.iconEmoji,
      iconBg: data.iconBg,
      model: data.model,
      systemPrompt: data.systemPrompt,
      requiredInputs: data.requiredInputs,
      exampleOutput: data.exampleOutput,
      pricingModel: data.pricingModel,
      priceUsd: Math.round(data.priceUsd * 100), // convert to cents
      status: "PENDING_REVIEW",
    },
  });

  return NextResponse.json({ success: true, data: { listingId: listing.id, slug: listing.slug } });
}
