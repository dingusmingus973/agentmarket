export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      listings: { orderBy: { createdAt: "desc" } },
    },
  });

  const approved = user?.listings.filter(l => l.status === "APPROVED") || [];
  const pending = user?.listings.filter(l => l.status !== "APPROVED") || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                {(user?.name || user?.email || "A")[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{user?.name || "Your Profile"}</h1>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
            <Link href="/sell" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              + List an agent
            </Link>
          </div>
          <div className="flex gap-8 mt-6 pt-6 border-t border-slate-100">
            <div>
              <div className="text-2xl font-bold text-slate-900">{approved.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Published agents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{approved.reduce((a, l) => a + (l.purchaseCount || 0), 0)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total sales</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{approved.reduce((a, l) => a + (l.totalRuns || 0), 0)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total runs</div>
            </div>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Pending review</h2>
            <div className="space-y-3">
              {pending.map(l => (
                <div key={l.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{l.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{l.shortDesc}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">Under review</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Published agents</h2>
        {approved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-base font-semibold text-slate-700 mb-2">No agents yet</h3>
            <p className="text-sm text-slate-400 mb-6">List your first agent and start earning.</p>
            <Link href="/sell" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              List an agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {approved.map(l => (
              <Link key={l.id} href={`/agent/${l.slug}`}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{l.iconEmoji || "🤖"}</span>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">Live</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{l.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{l.shortDesc}</p>
                <div className="flex justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <span>${(l.priceUsd / 100).toFixed(0)} one-time</span>
                  <span>{l.purchaseCount || 0} sales</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
