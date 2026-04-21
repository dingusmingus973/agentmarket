"use client";
// src/components/marketplace/PurchaseButton.tsx
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface Props {
  listingId: string;
  priceUsd: number;
  pricingModel: string;
  name: string;
}

export default function PurchaseButton({ listingId, priceUsd, pricingModel, name }: Props) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [licenseType, setLicenseType] = useState<"PERSONAL" | "COMMERCIAL">("PERSONAL");

  const isFree = pricingModel === "FREE" || priceUsd === 0;
  const total = licenseType === "COMMERCIAL" ? priceUsd + 1000 : priceUsd;

  async function handlePurchase() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/purchases/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, licenseType }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.data.free) {
        router.push("/dashboard?tab=agents");
      } else {
        window.location.href = data.data.checkoutUrl;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!isFree && (
        <div>
          <p className="text-xs text-slate-500 mb-2">License type</p>
          <div className="grid grid-cols-2 gap-2">
            {(["PERSONAL", "COMMERCIAL"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setLicenseType(type)}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                  licenseType === type
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <div className="font-medium capitalize">{type.toLowerCase()}</div>
                <div className="text-slate-400 mt-0.5">
                  {type === "PERSONAL"
                    ? `$${(priceUsd / 100).toFixed(0)}`
                    : `$${((priceUsd + 1000) / 100).toFixed(0)}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading
          ? "Loading..."
          : isFree
          ? "Get for free"
          : `Buy now · $${(total / 100).toFixed(0)}`}
      </button>

      {!isSignedIn && (
        <p className="text-xs text-center text-slate-400">
          You'll be asked to sign in
        </p>
      )}

      {!isFree && (
        <p className="text-xs text-center text-slate-400">
          7-day refund if it doesn't perform as described
        </p>
      )}
    </div>
  );
}
