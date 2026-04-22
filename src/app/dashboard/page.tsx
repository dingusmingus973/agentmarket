// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          slug: true,
          name: true,
          shortDesc: true,
          iconEmoji: true,
          iconBg: true,
          model: true,
        },
      },
      agentRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { agentRuns: true } },
    },
  });

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-xl font-medium text-slate-900 mb-2">Your agents</h1>
      <p className="text-sm text-slate-500 mb-8">
        {purchases.length} agent{purchases.length !== 1 ? "s" : ""} purchased
      </p>

      {purchases.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
          <p className="text-slate-500 text-sm mb-4">
            You haven't purchased any agents yet.
          </p>
          <Link
            href="/marketplace"
            className="inline-block px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
          >
            Browse agents
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: purchase.listing.iconBg }}
              >
                {purchase.listing.iconEmoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 text-sm">
                  {purchase.listing.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  {purchase.listing.shortDesc}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span>{purchase._count.agentRuns} runs</span>
                  <span>·</span>
                  <span className="font-mono text-xs">
                    Key: {purchase.licenseKey.slice(0, 12)}...
                  </span>
                  <span>·</span>
                  <span>{purchase.licenseType.toLowerCase()} license</span>
                </div>
              </div>

              <Link
                href={`/agent/${purchase.listing.slug}`}
                className="flex-shrink-0 px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:border-slate-300 transition-colors"
              >
                Open agent
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
