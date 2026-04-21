// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  listingId: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(1000),
});

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

  const { listingId, rating, body: reviewBody } = parsed.data;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  // Verify listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "APPROVED" },
  });
  if (!listing) {
    return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
  }

  // Check for existing review
  const existing = await prisma.review.findUnique({
    where: { listingId_authorId: { listingId, authorId: user.id } },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "You've already reviewed this agent" },
      { status: 409 }
    );
  }

  // Check if verified buyer
  const purchase = await prisma.purchase.findFirst({
    where: { buyerId: user.id, listingId, status: "COMPLETED" },
  });
  const verified = !!purchase;

  const review = await prisma.review.create({
    data: {
      listingId,
      authorId: user.id,
      rating,
      body: reviewBody,
      verified,
    },
  });

  // Recalculate listing average rating
  const agg = await prisma.review.aggregate({
    where: { listingId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      avgRating: agg._avg.rating ?? null,
      reviewCount: agg._count.rating,
    },
  });

  return NextResponse.json({
    success: true,
    data: { reviewId: review.id, verified },
  });
}

// GET — check if current user has already reviewed a listing
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: true, data: { canReview: false, reviewed: false } });
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ success: false, error: "listingId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return NextResponse.json({ success: true, data: { canReview: false, reviewed: false } });
  }

  const [existing, purchase] = await Promise.all([
    prisma.review.findUnique({
      where: { listingId_authorId: { listingId, authorId: user.id } },
    }),
    prisma.purchase.findFirst({
      where: { buyerId: user.id, listingId, status: "COMPLETED" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      canReview: !!purchase && !existing,
      reviewed: !!existing,
      hasPurchased: !!purchase,
    },
  });
}
