export const dynamic = "force-dynamic";
// src/app/api/admin/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  return adminIds.includes(userId);
}

// GET — list pending listings for review
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING_REVIEW";

  const listings = await prisma.listing.findMany({
    where: { status: status as any },
    orderBy: { createdAt: "asc" },
    include: {
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, data: listings });
}

// PATCH — approve or reject a listing
const schema = z.object({
  listingId: z.string(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { listingId, action, rejectionReason } = parsed.data;

  if (action === "reject" && !rejectionReason) {
    return NextResponse.json(
      { success: false, error: "Rejection reason required" },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      rejectionReason: action === "reject" ? rejectionReason : null,
      reviewedAt: new Date(),
      reviewedBy: userId,
    },
  });

  return NextResponse.json({ success: true, data: { listingId: listing.id, status: listing.status } });
}
