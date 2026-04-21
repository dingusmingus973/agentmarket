// src/app/api/listings/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { userId } = await auth();

  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    include: {
      seller: {
        select: { id: true, name: true, avatarUrl: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { purchases: true, reviews: true, sandboxRuns: true },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Only show APPROVED listings to the public (sellers can see their own pending)
  if (listing.status !== "APPROVED") {
    if (!userId) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || user.id !== listing.sellerId) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
  }

  // Check if current user has purchased this listing
  let hasPurchased = false;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user) {
      const purchase = await prisma.purchase.findFirst({
        where: { buyerId: user.id, listingId: listing.id, status: "COMPLETED" },
      });
      hasPurchased = !!purchase;
    }
  }

  // Strip system prompt from public view — only expose to buyers
  const safeSystemPrompt = hasPurchased ? listing.systemPrompt : undefined;

  return NextResponse.json({
    success: true,
    data: { ...listing, systemPrompt: safeSystemPrompt, hasPurchased },
  });
}
