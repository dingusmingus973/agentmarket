export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug, status: "APPROVED" },
    include: { seller: { select: { id: true, name: true, email: true } } },
  });

  if (!listing) notFound();

  const priceDisplay = listing.priceUsd === 0 ? "Free" : "$" + (listing.priceUsd / 100).toFixed(0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/marketplace" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-8">
          ← Back to marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">
                  {listing.iconEmoji || "🤖"}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{listing.name}</h1>
                  <p className="text-slate-500 mt-1">{listing.shortDesc}</p>
                </div>
              </div>

              {listing.tags && listing.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {listing.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">{tag}</span>
                  ))}
                </div>
              )}

              <div className="prose prose-sm max-w-none text-slate-600">
                <h2 className="text-base font-semibold text-slate-900 mb-2">About this agent</h2>
                <p className="leading-relaxed">{listing.fullDesc}</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-base font-semibold text-slate-900 mb-4">How it works</h2>
              <div className="space-y-3">
                {["Describe your inputs in the text field", "Click Run — Claude processes your request in seconds", "Copy and use the output directly in your workflow"].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</div>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-base font-semibold text-slate-900 mb-4">About the seller</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {(listing.seller?.name || "A")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{listing.seller?.name || "AgentMarket"}</p>
                  <p className="text-xs text-slate-400">Verified seller</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-6">
              <div className="text-3xl font-bold text-slate-900 mb-1">{priceDisplay}</div>
              {listing.priceUsd > 0 && <p className="text-sm text-slate-400 mb-6">one-time purchase</p>}
              {listing.priceUsd === 0 && <p className="text-sm text-slate-400 mb-6">free to use</p>}

              <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors mb-3">
                {listing.priceUsd === 0 ? "Try this agent" : `Buy for ${priceDisplay}`}
              </button>
              <button className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm">
                Try free sandbox (3 runs)
              </button>

              <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Category</span>
                  <span className="font-medium text-slate-900">{listing.category.replace("_", " ")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Model</span>
                  <span className="font-medium text-slate-900">Claude</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Pricing</span>
                  <span className="font-medium text-slate-900">{listing.pricingModel?.replace("_", " ") || "ONE TIME"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
