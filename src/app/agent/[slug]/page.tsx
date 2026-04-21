export const dynamic = "force-dynamic";
// src/app/agent/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import PurchaseButton from "@/components/marketplace/PurchaseButton";
import SandboxRunner from "@/components/marketplace/SandboxRunner";
import ReviewForm from "@/components/marketplace/ReviewForm";

export async function generateStaticParams() {
  const listings = await prisma.listing.findMany({
    where: { status: "APPROVED" },
    select: { slug: true },
  });
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    select: { name: true, shortDesc: true },
  });
  if (!listing) return {};
  return { title: `${listing.name} — AgentMarket`, description: listing.shortDesc };
}

async function getListing(slug: string) {
  return prisma.listing.findUnique({
    where: { slug, status: "APPROVED" },
    include: {
      seller: { select: { id: true, name: true, avatarUrl: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { author: { select: { name: true } } },
      },
      _count: { select: { purchases: true, reviews: true } },
    },
  });
}

export default async function AgentDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { userId } = await auth();
  const listing = await getListing(params.slug);
  if (!listing) notFound();

  // Check if current user has purchased
  let hasPurchased = false;
  let licenseKey: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user) {
      const purchase = await prisma.purchase.findFirst({
        where: { buyerId: user.id, listingId: listing.id, status: "COMPLETED" },
        select: { licenseKey: true },
      });
      hasPurchased = !!purchase;
      licenseKey = purchase?.licenseKey ?? null;
    }
  }

  const priceDisplay =
    listing.priceUsd === 0 ? "Free" : `$${(listing.priceUsd / 100).toFixed(0)}`;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background: listing.iconBg }}
            >
              {listing.iconEmoji}
            </div>
            <h1 className="text-2xl font-medium text-slate-900 mb-2">{listing.name}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>by {listing.seller.name}</span>
              <span>·</span>
              <span>{listing.totalRuns.toLocaleString()} runs</span>
              {listing.avgRating && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    {listing.avgRating.toFixed(1)} ({listing.reviewCount} reviews)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {listing.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
              >
                {tag}
              </span>
            ))}
            <span className="text-xs px-3 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {listing.model}
            </span>
          </div>

          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                What it does
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">{listing.fullDesc}</p>
            </div>

            <div>
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Required inputs
              </h2>
              <div className="flex flex-wrap gap-2">
                {listing.requiredInputs.map((input) => (
                  <span
                    key={input}
                    className="text-xs font-mono px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600"
                  >
                    {input}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Example output
              </h2>
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-wrap text-slate-700 font-mono leading-relaxed overflow-auto max-h-64">
                {listing.exampleOutput}
              </pre>
            </div>
          </div>

          {/* Sandbox runner (client component) */}
          <SandboxRunner
            listingId={listing.id}
            requiredInputs={listing.requiredInputs}
            hasPurchased={hasPurchased}
            licenseKey={licenseKey}
          />

          {/* Review form — only shown to verified buyers who haven't reviewed */}
          <ReviewForm listingId={listing.id} />

          {/* Reviews */}
          {listing.reviews.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-medium text-slate-900 mb-4">
                Reviews ({listing._count.reviews})
              </h2>
              <div className="space-y-4">
                {listing.reviews.map((review) => (
                  <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800">
                        {review.author.name}
                        {review.verified && (
                          <span className="ml-2 text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                            Verified buyer
                          </span>
                        )}
                      </span>
                      <span className="text-amber-400 text-sm">
                        {"★".repeat(review.rating)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-6">
            <div className="text-3xl font-medium text-slate-900 mb-1">{priceDisplay}</div>
            <div className="text-xs text-slate-400 mb-5">
              {listing.pricingModel === "FREE"
                ? "Free forever"
                : listing.pricingModel === "ONE_TIME"
                ? "One-time · yours forever"
                : "Per month"}
            </div>

            {hasPurchased ? (
              <div className="space-y-3">
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-sm text-brand-600 font-medium text-center">
                  ✓ You own this agent
                </div>
                <p className="text-xs text-slate-400 text-center">
                  Use the runner below to run it anytime
                </p>
              </div>
            ) : (
              <PurchaseButton
                listingId={listing.id}
                priceUsd={listing.priceUsd}
                pricingModel={listing.pricingModel}
                name={listing.name}
              />
            )}

            <div className="mt-5 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Model</span>
                <span className="text-slate-700">{listing.model}</span>
              </div>
              <div className="flex justify-between">
                <span>License</span>
                <span className="text-slate-700">Personal use</span>
              </div>
              <div className="flex justify-between">
                <span>Refund policy</span>
                <span className="text-slate-700">7 days</span>
              </div>
              <div className="flex justify-between">
                <span>Total runs</span>
                <span className="text-slate-700">{listing.totalRuns.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Purchases</span>
                <span className="text-slate-700">{listing._count.purchases}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
