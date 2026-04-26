export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { agentPurpose, category, systemPrompt } = await req.json();
  const prompt = `You help list AI agents on AgentMarket, a marketplace for recruiting tools. Generate a listing. Respond ONLY with valid JSON, no markdown:
{"name":"2-4 word product name","shortDesc":"One action-oriented sentence under 80 chars","fullDesc":"2-3 sentences: what it does, who it helps, what they get","tags":["tag1","tag2","tag3"]}

Agent info:
Category: ${category}
What it does: ${agentPurpose}
System prompt: ${systemPrompt}`;
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Parse failed" }, { status: 500 });
    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
