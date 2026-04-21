"use client";
// src/app/sell/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";

// ─── Types ───────────────────────────────
type Step = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  shortDesc: string;
  fullDesc: string;
  category: string;
  tags: string;
  iconEmoji: string;
  model: string;
  systemPrompt: string;
  requiredInputs: string;
  exampleOutput: string;
  pricingModel: string;
  priceUsd: string;
}

const CATEGORIES = [
  { value: "JOB_DESCRIPTION", label: "Job descriptions" },
  { value: "SOURCING", label: "Sourcing" },
  { value: "OUTREACH", label: "Outreach" },
  { value: "INTERVIEW", label: "Interviews" },
  { value: "OFFERS", label: "Offers" },
  { value: "OTHER", label: "Other" },
];

const MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "Recommended" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "Faster, cheaper" },
  { value: "gpt-4o", label: "GPT-4o", note: "" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", note: "Budget" },
];

const PRICING_MODELS = [
  { value: "ONE_TIME", label: "One-time purchase", desc: "Buyer pays once, owns forever" },
  { value: "FREE", label: "Free", desc: "No charge — great for building reputation" },
  { value: "SUBSCRIPTION", label: "Monthly subscription", desc: "Recurring monthly charge" },
];

const INITIAL: FormData = {
  name: "", shortDesc: "", fullDesc: "", category: "", tags: "",
  iconEmoji: "🤖", model: "claude-sonnet-4-6", systemPrompt: "",
  requiredInputs: "", exampleOutput: "", pricingModel: "ONE_TIME", priceUsd: "29",
};

// ─── Step indicator ──────────────────────
function StepBar({ current }: { current: Step }) {
  const steps = ["Details", "Configuration", "Pricing", "Review"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                  done
                    ? "bg-brand-500 border-brand-500 text-white"
                    : active
                    ? "border-brand-500 text-brand-600"
                    : "border-slate-300 text-slate-400"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={`text-sm ${
                  active ? "text-slate-900 font-medium" : done ? "text-brand-600" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-3 ${done ? "bg-brand-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field helper ────────────────────────
function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-slate-900 placeholder:text-slate-400 bg-white"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-slate-900 placeholder:text-slate-400 bg-white resize-y leading-relaxed"
    />
  );
}

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string; note?: string; desc?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
            value === opt.value
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="font-medium">{opt.label}</div>
          {(opt.note || opt.desc) && (
            <div className="text-xs mt-0.5 opacity-70">{opt.note || opt.desc}</div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────
export default function SellPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(key: keyof FormData) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        shortDesc: form.shortDesc,
        fullDesc: form.fullDesc,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        iconEmoji: form.iconEmoji || "🤖",
        model: form.model,
        systemPrompt: form.systemPrompt,
        requiredInputs: form.requiredInputs.split("\n").map((t) => t.trim()).filter(Boolean),
        exampleOutput: form.exampleOutput,
        pricingModel: form.pricingModel,
        priceUsd: form.pricingModel === "FREE" ? 0 : Number(form.priceUsd),
      };

      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Submission failed");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Not signed in
  if (isLoaded && !isSignedIn) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-medium text-slate-900 mb-3">Sign in to list an agent</h1>
        <p className="text-sm text-slate-500 mb-6">
          Create an account to start selling your AI agents to recruiters.
        </p>
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            Sign in to continue
          </button>
        </SignInButton>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-6">
          ✓
        </div>
        <h1 className="text-xl font-medium text-slate-900 mb-3">Submitted for review</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-sm mx-auto">
          We'll review your agent within 48 hours. We test every submission with 5 automated prompts and a manual check before it goes live. We'll email you when it's approved.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSuccess(false); setStep(1); setForm(INITIAL); }}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-lg hover:border-slate-300 transition-colors"
          >
            List another agent
          </button>
          <button
            onClick={() => router.push("/marketplace")}
            className="px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
          >
            Browse marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-slate-900 mb-2">List your agent</h1>
        <p className="text-sm text-slate-500">
          All submissions are reviewed within 48 hours. You keep 80% of every sale.
        </p>
      </div>

      <StepBar current={step} />

      {/* Step 1 — Details */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-slate-900 mb-1">Agent details</h2>
          <p className="text-xs text-slate-400 mb-5">Tell buyers what your agent does and who it's for.</p>

          <Field label="Agent name">
            <Input value={form.name} onChange={set("name")} placeholder="e.g. Engineering JD Writer Pro" />
          </Field>
          <Field label="Short description" hint="Shown on the listing card — max 200 characters.">
            <Textarea
              value={form.shortDesc}
              onChange={set("shortDesc")}
              placeholder="1–2 sentences: what it does and who it's for."
              rows={2}
            />
          </Field>
          <Field label="Full description">
            <Textarea
              value={form.fullDesc}
              onChange={set("fullDesc")}
              placeholder="Explain what the agent does, what inputs it needs, example use cases, and any limitations."
              rows={5}
            />
          </Field>
          <Field label="Category">
            <RadioGroup options={CATEGORIES} value={form.category} onChange={set("category")} />
          </Field>
          <Field label="Tags" hint="Comma-separated. E.g. sourcing, LinkedIn, Boolean search">
            <Input value={form.tags} onChange={set("tags")} placeholder="job descriptions, engineering, EEOC" />
          </Field>
          <Field label="Icon emoji" hint="Single emoji shown on your listing card.">
            <Input value={form.iconEmoji} onChange={set("iconEmoji")} placeholder="🤖" />
          </Field>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                if (!form.name || !form.shortDesc || !form.fullDesc || !form.category) {
                  setError("Please fill in all required fields.");
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors font-medium"
            >
              Continue to configuration →
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-3 text-right">{error}</p>}
        </div>
      )}

      {/* Step 2 — Configuration */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-slate-900 mb-1">Agent configuration</h2>
          <p className="text-xs text-slate-400 mb-5">Define the system prompt and inputs your agent requires.</p>

          <Field label="Model">
            <RadioGroup options={MODELS} value={form.model} onChange={set("model")} />
          </Field>
          <Field label="System prompt" hint="This is how your agent will behave for every buyer. Be specific and thorough — it's the core of your product.">
            <Textarea
              value={form.systemPrompt}
              onChange={set("systemPrompt")}
              placeholder={`You are an expert recruiter specializing in engineering roles.\n\nWhen given a job title, seniority level, and required skills, you write a compelling, clear job description...\n\nRules:\n- Use inclusive language\n- Keep total length 400-600 words`}
              rows={10}
            />
          </Field>
          <Field label="Required inputs (one per line)" hint="These are the fields buyers must fill in before running your agent. Use camelCase.">
            <Textarea
              value={form.requiredInputs}
              onChange={set("requiredInputs")}
              placeholder={"jobTitle\nseniorityLevel\nrequiredSkills\ncompanyName"}
              rows={5}
            />
          </Field>
          <Field label="Example output" hint="Show buyers what a great result looks like. This appears on your listing page.">
            <Textarea
              value={form.exampleOutput}
              onChange={set("exampleOutput")}
              placeholder="Paste the best output your agent has produced..."
              rows={7}
            />
          </Field>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => { setError(null); setStep(1); }}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:border-slate-300 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (!form.systemPrompt || !form.requiredInputs || !form.exampleOutput) {
                  setError("Please fill in all required fields.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors font-medium"
            >
              Continue to pricing →
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-3 text-right">{error}</p>}
        </div>
      )}

      {/* Step 3 — Pricing */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-slate-900 mb-1">Pricing</h2>
          <p className="text-xs text-slate-400 mb-5">You keep 80% of every sale. Stripe payouts weekly.</p>

          <Field label="Pricing model">
            <RadioGroup options={PRICING_MODELS} value={form.pricingModel} onChange={set("pricingModel")} />
          </Field>

          {form.pricingModel !== "FREE" && (
            <Field label="Price (USD)" hint="We recommend $19–$49 for one-time purchases at launch.">
              <div className="flex items-center gap-2 max-w-xs">
                <span className="text-slate-500 text-sm">$</span>
                <Input value={form.priceUsd} onChange={set("priceUsd")} type="number" placeholder="29" />
              </div>
            </Field>
          )}

          {form.pricingModel !== "FREE" && form.priceUsd && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-500">Buyer pays</span>
                <span className="text-slate-900 font-medium">${form.priceUsd}</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-500">Platform fee (20%)</span>
                <span className="text-slate-500">−${(Number(form.priceUsd) * 0.2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-medium">You earn per sale</span>
                <span className="text-brand-600 font-medium">${(Number(form.priceUsd) * 0.8).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => { setError(null); setStep(2); }}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:border-slate-300 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => { setError(null); setStep(4); }}
              className="px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors font-medium"
            >
              Review submission →
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-slate-900 mb-4">Review your submission</h2>

            <div className="space-y-3 text-sm">
              {[
                { label: "Name", value: form.name },
                { label: "Category", value: CATEGORIES.find((c) => c.value === form.category)?.label },
                { label: "Model", value: MODELS.find((m) => m.value === form.model)?.label },
                {
                  label: "Pricing",
                  value:
                    form.pricingModel === "FREE"
                      ? "Free"
                      : `$${form.priceUsd} ${form.pricingModel === "ONE_TIME" ? "one-time" : "/ month"}`,
                },
                {
                  label: "Required inputs",
                  value: form.requiredInputs.split("\n").filter(Boolean).join(", "),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-slate-400 w-32 flex-shrink-0">{label}</span>
                  <span className="text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
            <strong>What happens next:</strong> We'll run 5 automated test prompts against your agent and do a manual review. If approved, it goes live immediately and starts earning. If we need changes, we'll email you with specific feedback.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => { setError(null); setStep(3); }}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:border-slate-300 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
