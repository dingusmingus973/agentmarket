"use client";
// src/app/admin/page.tsx
import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface Listing {
  id: string;
  name: string;
  shortDesc: string;
  category: string;
  model: string;
  pricingModel: string;
  priceUsd: number;
  systemPrompt: string;
  requiredInputs: string[];
  exampleOutput: string;
  status: string;
  createdAt: string;
  seller: { name: string; email: string };
}

const STATUS_TABS = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    PENDING_REVIEW: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${map[status] ?? "bg-slate-50 text-slate-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<StatusTab>("PENDING_REVIEW");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/listings?status=${tab}`);
      const data = await res.json();
      if (data.success) setListings(data.data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  async function handleAction(listingId: string, action: "approve" | "reject") {
    if (action === "reject" && !rejectionReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setActing(listingId);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          action,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExpanded(null);
        setRejectionReason("");
        fetchListings();
      }
    } finally {
      setActing(null);
    }
  }

  if (!isLoaded) return null;

  // Basic client-side guard — real protection is in the API
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_IDS ?? "").split(",");
  const isAdmin = user && (adminIds.includes(user.id) || adminIds[0] === "");

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-medium text-slate-900 mb-2">Admin only</h1>
        <p className="text-sm text-slate-500">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-medium text-slate-900 mb-1">Review queue</h1>
          <p className="text-sm text-slate-500">Approve or reject agent submissions before they go live.</p>
        </div>
        <button
          onClick={fetchListings}
          className="text-sm px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {s === "PENDING_REVIEW" ? "Pending" : s === "APPROVED" ? "Approved" : "Rejected"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-xl text-slate-400 text-sm">
          No {tab === "PENDING_REVIEW" ? "pending" : tab.toLowerCase()} submissions.
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              {/* Summary row */}
              <div
                className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === listing.id ? null : listing.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-slate-900">{listing.name}</span>
                    <StatusBadge status={listing.status} />
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {listing.category.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{listing.shortDesc}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>by {listing.seller.name}</span>
                    <span>·</span>
                    <span>{listing.seller.email}</span>
                    <span>·</span>
                    <span>{listing.model}</span>
                    <span>·</span>
                    <span>
                      {listing.pricingModel === "FREE"
                        ? "Free"
                        : `$${(listing.priceUsd / 100).toFixed(0)} ${listing.pricingModel === "ONE_TIME" ? "one-time" : "/mo"}`}
                    </span>
                    <span>·</span>
                    <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-lg flex-shrink-0">
                  {expanded === listing.id ? "−" : "+"}
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === listing.id && (
                <div className="border-t border-slate-100 p-5 space-y-5">
                  {/* Required inputs */}
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                      Required inputs
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {listing.requiredInputs.map((inp) => (
                        <span
                          key={inp}
                          className="text-xs font-mono px-2 py-1 bg-slate-100 rounded text-slate-600"
                        >
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* System prompt */}
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                      System prompt
                    </h3>
                    <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-wrap font-mono text-slate-700 leading-relaxed max-h-48 overflow-auto">
                      {listing.systemPrompt}
                    </pre>
                  </div>

                  {/* Example output */}
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                      Example output
                    </h3>
                    <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-wrap font-mono text-slate-700 leading-relaxed max-h-48 overflow-auto">
                      {listing.exampleOutput}
                    </pre>
                  </div>

                  {/* Actions — only show for pending */}
                  {listing.status === "PENDING_REVIEW" && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="mb-3">
                        <label className="block text-xs text-slate-500 mb-1.5">
                          Rejection reason (required if rejecting)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain what needs to be fixed — this is sent to the seller."
                          rows={2}
                          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-slate-900 placeholder:text-slate-400 resize-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAction(listing.id, "approve")}
                          disabled={!!acting}
                          className="px-5 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors font-medium disabled:opacity-60"
                        >
                          {acting === listing.id ? "..." : "✓ Approve"}
                        </button>
                        <button
                          onClick={() => handleAction(listing.id, "reject")}
                          disabled={!!acting}
                          className="px-5 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-60"
                        >
                          {acting === listing.id ? "..." : "✕ Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
