// src/app/purchase/success/page.tsx
import { stripe } from "@/lib/stripe";
import Link from "next/link";

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  let agentName = "your agent";

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items"],
      });
      agentName = session.line_items?.data?.[0]?.description
        ? session.line_items.data[0].description.split(" — ")[0]
        : agentName;
    } catch {
      // Non-critical — just show generic success
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-6">
        ✓
      </div>
      <h1 className="text-xl font-medium text-slate-900 mb-3">You're all set</h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-sm mx-auto">
        <strong className="text-slate-800">{agentName}</strong> is ready to use. A
        receipt has been sent to your email. Access it anytime from your dashboard.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
        >
          Go to dashboard
        </Link>
        <Link
          href="/marketplace"
          className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-lg hover:border-slate-300 transition-colors"
        >
          Browse more agents
        </Link>
      </div>
    </main>
  );
}
