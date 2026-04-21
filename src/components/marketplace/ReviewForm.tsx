"use client";
// src/components/marketplace/ReviewForm.tsx
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Props {
  listingId: string;
}

export default function ReviewForm({ listingId }: Props) {
  const { isSignedIn } = useUser();
  const [status, setStatus] = useState<"loading" | "eligible" | "reviewed" | "not_eligible">("loading");
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) { setStatus("not_eligible"); return; }
    fetch(`/api/reviews?listingId=${listingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data.reviewed) setStatus("reviewed");
        else if (data.data.canReview) setStatus("eligible");
        else setStatus("not_eligible");
      })
      .catch(() => setStatus("not_eligible"));
  }, [listingId, isSignedIn]);

  async function handleSubmit() {
    if (!body.trim()) { setError("Please write a review."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, rating, body }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return null;
  if (status === "not_eligible") return null;

  if (status === "reviewed" || submitted) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 text-sm text-brand-700">
        ✓ {submitted ? "Your review has been posted. Thank you!" : "You've already reviewed this agent."}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-900 mb-1">Leave a review</h3>
      <p className="text-xs text-slate-400 mb-4">
        You'll be shown as a verified buyer.
      </p>

      {/* Star rating */}
      <div className="mb-4">
        <label className="block text-xs text-slate-500 mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="text-2xl transition-colors leading-none"
            >
              <span className={(hovered || rating) >= star ? "text-amber-400" : "text-slate-200"}>
                ★
              </span>
            </button>
          ))}
          <span className="text-xs text-slate-400 self-center ml-2">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][hovered || rating]}
          </span>
        </div>
      </div>

      {/* Review text */}
      <div className="mb-4">
        <label className="block text-xs text-slate-500 mb-1.5">Your review</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you use this agent for? Did it save you time? Any caveats others should know?"
          rows={4}
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Posting..." : "Post review"}
      </button>
    </div>
  );
}
