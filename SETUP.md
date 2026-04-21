# AgentMarket — Setup Guide

## What's in this scaffold

```
agentmarket/
├── prisma/
│   ├── schema.prisma        ← Full data model (users, listings, purchases, runs, reviews)
│   └── seed.ts              ← 5 seeded recruiter agents ready to go
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── listings/
│   │   │   │   ├── route.ts         ← GET listings (browse + filter)
│   │   │   │   ├── create/route.ts  ← POST create listing (sellers)
│   │   │   │   └── [slug]/route.ts  ← GET single listing detail
│   │   │   ├── sandbox/route.ts     ← POST free test runs (3 per user)
│   │   │   ├── agents/run/route.ts  ← POST run purchased agent
│   │   │   ├── purchases/
│   │   │   │   └── checkout/route.ts ← POST Stripe checkout session
│   │   │   ├── sellers/
│   │   │   │   └── connect/route.ts  ← POST/GET Stripe Connect onboarding
│   │   │   ├── admin/
│   │   │   │   └── listings/route.ts ← GET/PATCH listing review queue
│   │   │   └── webhooks/
│   │   │       ├── stripe/route.ts  ← Stripe payment events
│   │   │       └── clerk/route.ts   ← User sync on signup
│   │   ├── marketplace/page.tsx     ← Listings browse (server component, ISR)
│   │   ├── agent/[slug]/page.tsx    ← Agent detail + purchase
│   │   ├── dashboard/page.tsx       ← Buyer's purchased agents
│   │   ├── purchase/success/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   └── marketplace/
│   │       ├── PurchaseButton.tsx   ← Handles Stripe checkout flow
│   │       └── SandboxRunner.tsx    ← Test agent pre/post purchase
│   ├── lib/
│   │   ├── prisma.ts        ← Prisma singleton
│   │   ├── stripe.ts        ← Stripe client + fee helpers
│   │   └── llm.ts           ← LLM router (Claude + OpenAI + injection guard)
│   ├── types/index.ts
│   └── middleware.ts        ← Clerk auth + route protection
├── .env.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Step 1 — Install dependencies

```bash
cd agentmarket
npm install
```

---

## Step 2 — Set up Supabase (database)

1. Go to **supabase.com** → New project
2. Once created: **Settings → Database → Connection string**
3. Copy both the **pooled** (port 6543) and **direct** (port 5432) URLs
4. Add to `.env.local`:

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

---

## Step 3 — Set up Clerk (auth)

1. Go to **clerk.com** → Create application
2. Enable: Email, Google, LinkedIn (good for recruiters)
3. **API Keys** → copy publishable + secret keys
4. **Webhooks** → Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret
5. Add to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

Also install the svix package (needed for Clerk webhook verification):
```bash
npm install svix
```

---

## Step 4 — Set up Stripe

1. Go to **dashboard.stripe.com** → Get API keys
2. **Connect settings** → Enable Stripe Connect (Express accounts)
3. **Webhooks** → Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Subscribe to: `checkout.session.completed`, `charge.dispute.created`, `charge.refunded`
   - Copy signing secret
4. Add to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_FEE_PERCENT=20
```

---

## Step 5 — Add LLM API keys

At minimum, add your Anthropic key (all seed agents use Claude):

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...   # optional, only needed for GPT-4o agents
```

---

## Step 6 — Set your admin user ID

1. Sign up in the app once (after deploy or on localhost)
2. Go to **Clerk dashboard → Users** → copy your user ID (looks like `user_2abc...`)
3. Add to `.env.local`:

```
ADMIN_USER_IDS=user_2abc...
```

---

## Step 7 — Push database schema + seed

```bash
# Push schema to Supabase
npm run db:push

# Seed the 5 starter recruiter agents
npm run db:seed
```

---

## Step 8 — Run locally

```bash
# Copy env file
cp .env.example .env.local
# (fill in all values from steps above)

npm run dev
# → http://localhost:3000
```

For Stripe webhooks locally, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Step 9 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set all environment variables in **Vercel dashboard → Settings → Environment Variables**.

Update webhook URLs in Clerk and Stripe dashboards to your production domain.

---

## Key business rules implemented

| Rule | Where |
|------|-------|
| 3 free sandbox runs per user (IP fallback for anon) | `api/sandbox/route.ts` |
| Version locking — buyers always run the config they paid for | `api/webhooks/stripe` + `api/agents/run` |
| System prompt hidden from non-buyers | `api/listings/[slug]/route.ts` |
| Platform takes 20% on every sale automatically | `api/purchases/checkout/route.ts` (Stripe application_fee_amount) |
| Free listings skip Stripe entirely | `api/purchases/checkout/route.ts` |
| Prompt injection scanning on all user inputs | `lib/llm.ts` |
| All listings require admin approval before going live | `api/admin/listings/route.ts` |
| Duplicate Stripe webhook events are idempotent | `api/webhooks/stripe/route.ts` |
| Commercial license is +$10 over base price | `components/marketplace/PurchaseButton.tsx` |

---

## Next features to build (Phase 2)

- [ ] `src/app/sell/page.tsx` — seller submission form (connects to `api/listings/create`)
- [ ] `src/app/sell/dashboard/page.tsx` — seller analytics (runs, revenue, reviews per listing)
- [ ] `src/app/admin/page.tsx` — admin review queue UI
- [ ] `src/app/api/reviews/route.ts` — POST submit review (verified buyers only)
- [ ] Email notifications via Resend (purchase receipts, review alerts, payout summaries)
- [ ] Listing versioning — let sellers update without breaking existing buyers
- [ ] Subscription pricing — Stripe recurring prices for monthly agents
