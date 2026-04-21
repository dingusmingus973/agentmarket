// src/lib/llm.ts
// Unified LLM router — supports Claude and OpenAI

export type SupportedModel =
  | "claude-sonnet-4-6"
  | "claude-opus-4-6"
  | "claude-haiku-4-5-20251001"
  | "gpt-4o"
  | "gpt-4o-mini";

export interface RunAgentParams {
  model: SupportedModel;
  systemPrompt: string;
  userInput: string;
  maxTokens?: number;
}

export interface RunAgentResult {
  output: string;
  tokensUsed: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

// Basic prompt injection detection
function containsInjection(text: string): boolean {
  const patterns = [
    /ignore (all |previous |above |prior )?instructions/i,
    /disregard (all |previous |above |prior )?instructions/i,
    /forget (all |previous |above |prior )?instructions/i,
    /you are now/i,
    /act as (if )?/i,
    /system prompt/i,
    /\[INST\]/i,
    /<\|.*?\|>/i,
  ];
  return patterns.some((p) => p.test(text));
}

export async function runAgent({
  model,
  systemPrompt,
  userInput,
  maxTokens = 1500,
}: RunAgentParams): Promise<RunAgentResult> {
  const start = Date.now();

  // Guard: injection check on user input
  if (containsInjection(userInput)) {
    return {
      output: "",
      tokensUsed: 0,
      durationMs: 0,
      success: false,
      error: "Input contains disallowed content.",
    };
  }

  try {
    if (model.startsWith("claude-")) {
      return await runClaude({ model, systemPrompt, userInput, maxTokens, start });
    } else if (model.startsWith("gpt-")) {
      return await runOpenAI({ model, systemPrompt, userInput, maxTokens, start });
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (err) {
    return {
      output: "",
      tokensUsed: 0,
      durationMs: Date.now() - start,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function runClaude({
  model,
  systemPrompt,
  userInput,
  maxTokens,
  start,
}: RunAgentParams & { start: number }): Promise<RunAgentResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userInput }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const output = data.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  return {
    output,
    tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    durationMs: Date.now() - start,
    success: true,
  };
}

async function runOpenAI({
  model,
  systemPrompt,
  userInput,
  maxTokens,
  start,
}: RunAgentParams & { start: number }): Promise<RunAgentResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const output = data.choices?.[0]?.message?.content ?? "";

  return {
    output,
    tokensUsed: data.usage?.total_tokens ?? 0,
    durationMs: Date.now() - start,
    success: true,
  };
}
