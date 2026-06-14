# InkFlow AI — Artisan Edition

An AI artistic-signature studio built from the **Stitch "AI Artistic Signature"** design system.
Includes **login, credits, Stripe billing (test mode), and server-backed AI generation**.

## Features

| Page | Route | What it does |
| --- | --- | --- |
| **Home** | `/` | Landing page with Stitch design photos and feature bento grid. |
| **Hand-drawn AI Studio** | `/studio` | Live canvas signature generator. **Render Final Ink** (1 credit) calls server AI and exports HD PNG. Free watermarked preview. |
| **Refinement Workbench** | `/refine` | Upload + client-side ink isolation. **Save PNG** (1 credit) runs server analysis and exports. |
| **Learning** | `/learn` | Guided tracing practice with accuracy / rhythm scores (free). |
| **Account** | `/account` | Sign in, credit balance, buy packs via Stripe. |

## Three-step monetization (implemented)

### Step 1 — Login & credits (mock-ready)

- **NextAuth** credentials (email + password)
- **SQLite** database via Prisma (`prisma/dev.db`)
- Nav shows credit balance; new users get **5 free credits** on first sign-in
- Demo user (after `npm run db:seed`):

  - Email: `studio@inkflow.ai`
  - Password: `inkflow2024`
  - Credits: **10**

### Step 2 — Stripe (test mode)

- Credit packs on `/account` → **Buy with Stripe**
- Webhook: `POST /api/stripe/webhook` adds credits after `checkout.session.completed`
- Without Stripe keys: use **Dev: +10 credits** on the account page (development only)

### Step 3 — Server AI APIs

- `POST /api/generate` — deducts 1 credit, returns enhanced signature parameters (fluidity/rhythm/pressure tuning)
- `POST /api/refine` — deducts 1 credit, analyzes upload and returns optimal threshold/smoothing

## Getting started

```bash
npm install
cp .env.example .env   # then edit secrets
npm run db:push
npm run db:seed
npm run dev            # http://localhost:3000
```

> **Note:** This project uses `INKFLOW_DATABASE_URL` (not `DATABASE_URL`) so it does not conflict with a global Postgres `DATABASE_URL` on your machine.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `INKFLOW_DATABASE_URL` | SQLite path, e.g. `file:./prisma/dev.db` |
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3010` |
| `NEXTAUTH_SECRET` | Random string for JWT |
| `STRIPE_SECRET_KEY` | Stripe test secret `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` or Dashboard webhooks |

### Stripe local testing

1. Add `STRIPE_SECRET_KEY` to `.env`
2. Forward webhooks:

```bash
stripe listen --forward-to localhost:3010/api/stripe/webhook
```

3. Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`
4. Sign in → Account → buy a pack → complete test checkout

## Scripts

```bash
npm run dev          # development server
npm run build        # prisma generate + production build
npm run db:push      # sync SQLite schema
npm run db:seed      # create demo user
```

## Credit costs

| Action | Cost |
| --- | --- |
| Render Final Ink (Studio) | 1 credit |
| Save refined PNG (Workbench) | 1 credit |
| Live preview, practice, watermarked export | Free |

## Project structure

```
prisma/schema.prisma     # User, credits, Stripe purchases
src/app/api/
  auth/[...nextauth]     # NextAuth
  credits/               # Balance + history
  generate/              # Server AI signature enhancement
  refine/                # Server AI refine analysis
  stripe/checkout|webhook
src/app/account/         # Login + billing UI
src/lib/credits.ts       # Deduct / add credits
src/lib/server-ai.ts     # Server enhancement logic
```
