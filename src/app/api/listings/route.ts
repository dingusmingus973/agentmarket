// src/app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AgentCategory, ListingStatus } from "@prisma/client";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") as AgentCategory | null;
  const search = searchParams.get("q");
  const sort = searchParams.get("sort") ?? "popular"; // popular | newest | rating | price_asc | price_desc
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const skip = (page - 1) * limit;

  const where = {
    status: ListingStatus.APPROVED,
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { shortDesc: { contains: search, mode: "insensitive" as const } },
            { tags: { has: search } },
          ],
        }
      : {}),
  };

  const orderBy = {
    popular: { totalRuns: "desc" as const },
    newest: { createdAt: "desc" as const },
    rating: { avgRating: "desc" as const },
    price_asc: { priceUsd: "asc" as const },
    price_desc: { priceUsd: "desc" as const },
  }[sort] ?? { totalRuns: "desc" as const };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        category: true,
        tags: true,
        iconEmoji: true,
        iconBg: true,
        model: true,
        pricingModel: true,
        priceUsd: true,
        avgRating: true,
        reviewCount: true,
        totalRuns: true,
        purchaseCount: true,
        createdAt: true,
        seller: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      listings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
  });
}
