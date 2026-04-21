export const dynamic = "force-dynamic";
// src/app/api/sandbox/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runAgent, SupportedModel } from "@/lib/llm";
import { z } from "zod";

const FREE_RUNS_PER_USER = 3;
const FREE_RUNS_PER_IP = 3;

const schema = z.object({
  listingId: z.string(),
  input: z.record(z.string()),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { listingId, input } = parsed.data;

  // Fetch listing
  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "APPROVED" },
  });
  if (!listing) {
    return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
  }

  // Resolve user
  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { clerkId: userId } });
  }

  // Check if user has already purchased — purchased users get unlimited runs
  if (user) {
    const purchase = await prisma.purchase.findFirst({
      where: { buyerId: user.id, listingId, status: "COMPLETED" },
    });
    if (purchase) {
      // Purchased — run without limit check
      return await executeRun({ listing, input, userId: user.id, ipAddress, isSandbox: false });
    }
  }

  // Count existing sandbox runs (rate limit)
  const existingRuns = await prisma.sandboxRun.count({
    where: user
      ? { listingId, userId: user.id }
      : { listingId, ipAddress },
  });

  const limit = user ? FREE_RUNS_PER_USER : FREE_RUNS_PER_IP;
  if (existingRuns >= limit) {
    return NextResponse.json(
      {
        success: false,
        error: "Free run limit reached",
        code: "LIMIT_REACHED",
        runsUsed: existingRuns,
        runsLimit: limit,
      },
      { status: 429 }
    );
  }

  return await executeRun({
    listing,
    input,
    userId: user?.id ?? null,
    ipAddress,
    isSandbox: true,
    runsRemaining: limit - existingRuns - 1,
  });
}

async function executeRun({
  listing,
  input,
  userId,
  ipAddress,
  isSandbox,
  runsRemaining,
}: {
  listing: { id: string; model: string; systemPrompt: string; requiredInputs: string[] };
  input: Record<string, string>;
  userId: string | null;
  ipAddress: string;
  isSandbox: boolean;
  runsRemaining?: number;
}) {
  // Validate all required inputs are present
  const missing = listing.requiredInputs.filter((f) => !input[f]);
  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `Missing required inputs: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // Build user message from inputs
  const userMessage = Object.entries(input)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const result = await runAgent({
    model: listing.model as SupportedModel,
    systemPrompt: listing.systemPrompt,
    userInput: userMessage,
    maxTokens: isSandbox ? 800 : 1500, // shorter output for sandbox
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  // Record the run
  if (isSandbox) {
    await prisma.sandboxRun.create({
      data: {
        listingId: listing.id,
        userId,
        ipAddress,
        input,
        output: result.output,
        model: listing.model,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
        success: true,
      },
    });

    // Increment listing run counter
    await prisma.listing.update({
      where: { id: listing.id },
      data: { totalRuns: { increment: 1 } },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      output: result.output,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
      runsRemaining: runsRemaining ?? null,
    },
  });
}
