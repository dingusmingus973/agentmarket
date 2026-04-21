export const dynamic = "force-dynamic";
// src/app/marketplace/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 60; // ISR — revalidate every 60s

async function getListings(category?: string) {
  return prisma.listing.findMany({
    where: {
      status: "APPROVED",
      ...(category ? { category: category as any } : {}),
    },
    orderBy: { totalRuns: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDesc: true,
      category: true,
      iconEmoji: true,
      iconBg: true,
      pricingModel: true,
      priceUsd: true,
      avgRating: true,
      reviewCount: true,
      totalRuns: true,
      seller: { select: { name: true } },
    },
  });
}

const CATEGORIES = [
  { value: "", label: "All agents" },
  { value: "JOB_DESCRIPTION", label: "Job descriptions" },
  { value: "SOURCING", label: "Sourcing" },
  { value: "OUTREACH", label: "Outreach" },
  { value: "INTERVIEW", label: "Interviews" },
  { value: "OFFERS", label: "Offers" },
];

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const listings = await getListings(searchParams.category);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-slate-900 mb-2">
          AI agents for recruiters
        </h1>
        <p className="text-slate-500 text-sm">
          {listings.length} agents — tested, reviewed, and ready to use
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.value}
            href={cat.value ? `/marketplace?category=${cat.value}` : "/marketplace"}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              (searchParams.category ?? "") === cat.value
                ? "bg-brand-50 border-brand-500 text-brand-600 font-medium"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/agent/${listing.slug}`}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: listing.iconBg }}
              >
                {listing.iconEmoji}
              </div>
              {listing.pricingModel === "FREE" ? (
                <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-600 font-medium">
                  Free
                </span>
              ) : null}
            </div>

            <h2 className="text-sm font-medium text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
              {listing.name}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
              {listing.shortDesc}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">
                {listing.priceUsd === 0
                  ? "Free"
                  : `$${(listing.priceUsd / 100).toFixed(0)}`}
                {listing.priceUsd > 0 && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    one-time
                  </span>
                )}
              </span>
              {listing.avgRating && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="text-amber-400">★</span>
                  {listing.avgRating.toFixed(1)} ({listing.reviewCount})
                </span>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              by {listing.seller.name} · {listing.totalRuns.toLocaleString()} runs
            </div>
          </Link>
        ))}
      </div>

      {listings.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          No agents found in this category yet.{" "}
          <Link href="/sell" className="text-brand-600 underline">
            Be the first to list one
          </Link>
        </div>
      )}
    </main>
  );
}
