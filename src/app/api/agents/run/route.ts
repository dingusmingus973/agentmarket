// src/app/api/agents/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runAgent, SupportedModel } from "@/lib/llm";
import { z } from "zod";

const schema = z.object({
  licenseKey: z.string(),
  input: z.record(z.string()),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const { licenseKey, input } = parsed.data;

  // Validate purchase ownership
  const purchase = await prisma.purchase.findUnique({
    where: { licenseKey },
    include: {
      buyer: true,
      listing: { select: { id: true, name: true } },
    },
  });

  if (!purchase) {
    return NextResponse.json({ success: false, error: "Invalid license key" }, { status: 404 });
  }

  if (purchase.buyer.clerkId !== userId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (purchase.status !== "COMPLETED") {
    return NextResponse.json(
      { success: false, error: "Purchase is not active" },
      { status: 403 }
    );
  }

  // Validate required inputs using LOCKED version (not current listing version)
  const missing = purchase.lockedRequiredInputs.filter((f) => !input[f]);
  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `Missing required inputs: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const userMessage = Object.entries(input)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const result = await runAgent({
    model: purchase.lockedModel as SupportedModel,
    systemPrompt: purchase.lockedSystemPrompt, // always use locked version
    userInput: userMessage,
    maxTokens: 1500,
  });

  if (!result.success) {
    // Log failed run
    await prisma.agentRun.create({
      data: {
        purchaseId: purchase.id,
        input,
        output: "",
        model: purchase.lockedModel,
        tokensUsed: 0,
        durationMs: result.durationMs,
        success: false,
        errorMsg: result.error,
      },
    });

    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  // Log successful run
  const run = await prisma.agentRun.create({
    data: {
      purchaseId: purchase.id,
      input,
      output: result.output,
      model: purchase.lockedModel,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
      success: true,
    },
  });

  // Increment listing run counter
  await prisma.listing.update({
    where: { id: purchase.listingId },
    data: { totalRuns: { increment: 1 } },
  });

  return NextResponse.json({
    success: true,
    data: {
      runId: run.id,
      output: result.output,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
    },
  });
}
