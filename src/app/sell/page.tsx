"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATS = [
  { key: "JOB_DESCRIPTION", label: "Job Descriptions", icon: "📝" },
  { key: "SOURCING", label: "Sourcing", icon: "🔍" },
  { key: "OUTREACH", label: "Outreach", icon: "✉️" },
  { key: "INTERVIEW", label: "Interviews", icon: "🎯" },
  { key: "OFFERS", label: "Offers", icon: "🤝" },
  { key: "OTHER", label: "Other", icon: "🤖" },
];

const PRICES = [
  { label: "Free", value: 0 },
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
  { label: "$15", value: 1500 },
  { label: "$20", value: 2000 },
  { label: "$25", value: 2500 },
];

export default function SellPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: "", agentPurpose: "", priceUsd: 1500,
    systemPrompt: "", name: "", shortDesc: "", fullDesc: "", tags: "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function generate() {
    setGenerating(true); setError("");
    try {
      const res = await fetch("/api/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentPurpose: form.agentPurpose, category: form.category, systemPrompt: form.systemPrompt }),
      });
      const data = await res.json();
      if (data.name) {
        set("name", data.name); set("shortDesc", data.shortDesc);
        set("fullDesc", data.fullDesc); set("tags", (data.tags || []).join(", "));
        setStep(3);
      } else { setError("Could not generate — fill in manually."); setStep(3); }
    } catch { setError("Generation failed — fill in manually."); setStep(3); }
    setGenerating(false);
  }

  async function submit() {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, shortDesc: form.shortDesc, fullDesc: form.fullDesc,
          category: form.category, systemPrompt: form.systemPrompt,
          priceUsd: form.priceUsd,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.slug) router.push(`/agent/${data.slug}`);
      else setError(data.error || "Submission failed.");
    } catch { setError("Submission failed."); }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-10">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>{s}</div>
              {s < 3 && <div className={`h-0.5 w-10 ${step > s ? "bg-indigo-600" : "bg-slate-200"}`} />}
            </div>
          ))}
          <span className="text-sm text-slate-500 ml-1">
            {step === 1 ? "About your agent" : step === 2 ? "System prompt" : "Review & publish"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">What does your agent do?</h1>
              <p className="text-slate-500 text-sm mb-8">Describe it plainly — AI will generate the name, description, and tags.</p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATS.map(c => (
                    <button key={c.key} onClick={() => set("category", c.key)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left ${form.category === c.key ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      <span>{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Describe it <span className="text-slate-400 font-normal">(plain English)</span></label>
                <textarea value={form.agentPurpose} onChange={e => set("agentPurpose", e.target.value)}
                  rows={4} placeholder="e.g. Takes a job title and key details and writes a compelling, formatted job description ready to post on LinkedIn."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-2">Price</label>
                <div className="flex flex-wrap gap-2">
                  {PRICES.map(p => (
                    <button key={p.value} onClick={() => set("priceUsd", p.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${form.priceUsd === p.value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!form.category || !form.agentPurpose}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Your system prompt</h1>
              <p className="text-slate-500 text-sm mb-8">This is what Claude receives when someone runs your agent. Be specific.</p>
              <textarea value={form.systemPrompt} onChange={e => set("systemPrompt", e.target.value)}
                rows={12} placeholder={`You are an expert recruiter who writes compelling job descriptions.\n\nGiven a job title and company description, write a complete job description with:\n- A strong 2-sentence company overview\n- 5-7 key responsibilities  \n- 5-7 requirements\n- A closing paragraph\n\nUse markdown formatting. Keep tone professional but engaging.`}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono mb-6" />
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
                <button onClick={generate} disabled={!form.systemPrompt || generating}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  {generating ? <><span className="animate-spin inline-block">⟳</span> Generating...</> : <>✨ Generate listing with AI</>}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Review & publish</h1>
              <p className="text-slate-500 text-sm mb-8">AI generated your listing — edit anything before submitting.</p>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Agent name</label>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Short description <span className="text-slate-400 font-normal">(shown on cards)</span></label>
                  <input value={form.shortDesc} onChange={e => set("shortDesc", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full description</label>
                  <textarea value={form.fullDesc} onChange={e => set("fullDesc", e.target.value)}
                    rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags <span className="text-slate-400 font-normal">(comma separated)</span></label>
                  <input value={form.tags} onChange={e => set("tags", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
                <button onClick={submit} disabled={submitting || !form.name || !form.shortDesc}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  {submitting ? <><span className="animate-spin inline-block">⟳</span> Submitting...</> : "🚀 Submit for review"}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">Reviewed within 24 hours before going live.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
