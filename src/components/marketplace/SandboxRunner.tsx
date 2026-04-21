"use client";
// src/components/marketplace/SandboxRunner.tsx
import { useState } from "react";

interface Props {
  listingId: string;
  requiredInputs: string[];
  hasPurchased: boolean;
  licenseKey: string | null;
}

export default function SandboxRunner({
  listingId,
  requiredInputs,
  hasPurchased,
  licenseKey,
}: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runsRemaining, setRunsRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  function formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  async function handleRun() {
    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const endpoint = hasPurchased && licenseKey ? "/api/agents/run" : "/api/sandbox";
      const body =
        hasPurchased && licenseKey
          ? { licenseKey, input: inputs }
          : { listingId, input: inputs };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.code === "LIMIT_REACHED") {
          setLimitReached(true);
          setError("Free run limit reached. Purchase to keep using this agent.");
        } else {
          setError(data.error ?? "Something went wrong");
        }
        return;
      }

      setOutput(data.data.output);
      if (data.data.runsRemaining !== null) {
        setRunsRemaining(data.data.runsRemaining);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const allFilled = requiredInputs.every((k) => inputs[k]?.trim());

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <div className="text-sm font-medium text-slate-900">
            {hasPurchased ? "Run this agent" : "Try before you buy"}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {hasPurchased
              ? "Unlimited runs included with your purchase"
              : runsRemaining !== null
              ? `${runsRemaining} free run${runsRemaining !== 1 ? "s" : ""} remaining`
              : "3 free runs — no account needed"}
          </div>
        </div>
        <span className="text-slate-400 text-lg">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-5">
          {limitReached ? (
            <div className="text-center py-6">
              <div className="text-sm text-slate-700 mb-2 font-medium">
                You've used your 3 free runs
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Purchase to run this agent as many times as you need.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {requiredInputs.map((key) => (
                  <div key={key}>
                    <label className="block text-xs text-slate-500 mb-1.5">
                      {formatLabel(key)}
                    </label>
                    <input
                      type="text"
                      value={inputs[key] ?? ""}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-slate-900 placeholder:text-slate-400"
                      placeholder={`Enter ${formatLabel(key).toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleRun}
                disabled={loading || !allFilled}
                className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Running..." : hasPurchased ? "Run agent" : "Run test"}
              </button>

              {error && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}

              {output && (
                <div className="mt-4">
                  <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                    Output
                  </div>
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-wrap text-slate-700 font-mono leading-relaxed max-h-80 overflow-auto">
                    {output}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
