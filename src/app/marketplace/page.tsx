export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const CATEGORIES = [
  { key: "all", label: "All agents" },
  { key: "JOB_DESCRIPTION", label: "Job Descriptions" },
  { key: "SOURCING", label: "Sourcing" },
  { key: "OUTREACH", label: "Outreach" },
  { key: "INTERVIEW", label: "Interviews" },
  { key: "OFFERS", label: "Offers" },
];

const ICONS: Record<string, string> = {
  JOB_DESCRIPTION: "📝",
  SOURCING: "🔍",
  OUTREACH: "✉️",
  INTERVIEW: "🎯",
  OFFERS: "🤝",
  OTHER: "🤖",
};

const COLORS: Record<string, string> = {
  JOB_DESCRIPTION: "bg-blue-50 text-blue-700 border-blue-100",
  SOURCING: "bg-violet-50 text-violet-700 border-violet-100",
  OUTREACH: "bg-emerald-50 text-emerald-700 border-emerald-100",
  INTERVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  OFFERS: "bg-rose-50 text-rose-700 border-rose-100",
  OTHER: "bg-slate-50 text-slate-600 border-slate-100",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const category = searchParams?.category || "all";
  const query = searchParams?.q || "";

  const listings = await prisma.listing.findMany({
    where: {
      status: "APPROVED",
      ...(category !== "all" ? { category: category as any } : {}),
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { shortDesc: { contains: query, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { seller: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
            AI agents for recruiters
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            {listings.length} agent{listings.length !== 1 ? "s" : ""} — built by recruiters, for recruiters.
          </p>
          <form method="GET" action="/marketplace">
            {category !== "all" && <input type="hidden" name="category" value={category} />}
            <div className="flex gap-3 max-w-xl">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input name="q" defaultValue={query} placeholder="Search agents..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm" />
              </div>
              <button type="submit" className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                Search
              </button>
            </div>
          </form>
        </div>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <Link key={cat.key} href={`/marketplace?category=${cat.key}${query ? "&q=" + encodeURIComponent(query) : ""}`}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${category === cat.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No agents found</h3>
            <p className="text-slate-400 text-sm">{query ? `No results for "${query}"` : "No agents in this category yet."}</p>
            {query && <Link href="/marketplace" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">Clear search</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => {
              const catColors = COLORS[listing.category] || COLORS.OTHER;
              const catLabel = CATEGORIES.find(c => c.key === listing.category)?.label || listing.category;
              const priceDisplay = listing.priceUsd === 0 ? "Free" : "$" + (listing.priceUsd / 100).toFixed(0);
              return (
                <Link key={listing.id} href={`/agent/${listing.slug}`}
                  className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl">
                      {ICONS[listing.category] || "🤖"}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${catColors}`}>{catLabel}</span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{listing.name}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1">{listing.shortDesc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-lg font-bold text-slate-900">{priceDisplay}</span>
                      {listing.priceUsd > 0 && <span className="text-xs text-slate-400 ml-1">one-time</span>}
                    </div>
                    <span className="text-xs text-slate-400">{listing.seller?.name || "AgentMarket"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
