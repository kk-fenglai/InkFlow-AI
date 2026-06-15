# InkFlow AI — Artisan Edition

An AI artistic-signature studio built from the **Stitch "AI Artistic Signature"** design system.
Includes **login, credits, Stripe billing (test mode), and server-backed AI generation**.

## Features

| Page | Route | What it does |
| --- | --- | --- |
| **Home** | `/` | Landing page with Stitch design photos and feature bento grid. |
| **Hand-drawn AI Studio** | `/studio` | Live canvas signature generator. **Render Final Ink** (1 credit) calls server AI and exports HD PNG. Free watermarked preview. |
| **Refinement Workbench** | `/refine` | Upload + client-side ink isolation. **Save PNG** (1 credit) runs server analysis and exports. |
| **Account** | `/account` | Sign in, credit balance, buy packs via Stripe. |

## Three-step monetization (implemented)

### Step 1 — Login & credits (mock-ready)

- **NextAuth** credentials (email + password)
- **PostgreSQL** (Neon) via Prisma — see [Deploy: Vercel + Neon](#deploy-vercel--neon)
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
cp .env.example .env   # Neon URLs + secrets
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:3000
```

> **Note:** Uses `INKFLOW_DATABASE_URL` (pooled) and `INKFLOW_DATABASE_URL_UNPOOLED` (migrations). Get both from the [Neon](https://neon.tech) console.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `INKFLOW_DATABASE_URL` | Neon **pooled** Postgres URL (runtime) |
| `INKFLOW_DATABASE_URL_UNPOOLED` | Neon **direct** Postgres URL (migrations) |
| `NEXTAUTH_URL` | App URL, e.g. `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Random string for JWT |
| `STRIPE_SECRET_KEY` | Stripe test secret `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` or Dashboard webhooks |
| `DEEPSEEK_API_KEY` | DeepSeek API for AI Natural Language Tune |

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
npm run build        # prisma migrate deploy + next build
npm run db:migrate   # apply migrations (production / CI)
npm run db:migrate:dev  # create migrations locally
npm run db:seed      # create demo user
```

## Deploy: Vercel + Neon

### 1. Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy **Pooled connection** → `INKFLOW_DATABASE_URL`.
3. Copy **Direct connection** → `INKFLOW_DATABASE_URL_UNPOOLED`.
4. (Optional) Run seed once from your machine after setting `.env`:
   ```bash
   npm run db:migrate && npm run db:seed
   ```

### 2. Vercel

1. Push the repo to GitHub and [import on Vercel](https://vercel.com/new).
2. **Environment variables** (Production + Preview):

   | Variable | Value |
   | --- | --- |
   | `INKFLOW_DATABASE_URL` | Neon pooled URL |
   | `INKFLOW_DATABASE_URL_UNPOOLED` | Neon direct URL |
   | `NEXTAUTH_URL` | `https://<your-domain>.vercel.app` |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `STRIPE_*` / `DEEPSEEK_*` | As in `.env.example` |

3. Deploy — build runs `prisma migrate deploy` then `next build`.
4. After first deploy, set `NEXTAUTH_URL` to your final custom domain if you add one.

### 3. Stripe Webhook (production)

In Stripe Dashboard → Webhooks → Add endpoint:

```
https://<your-domain>/api/stripe/webhook
```

Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.

Copy the signing secret to Vercel as `STRIPE_WEBHOOK_SECRET`.

### 4. Smoke test

- Register / sign in
- Studio → AI Tune (shows `(AI)` when logged in)
- Account → buy credits (test mode) → credits increase after webhook

## Credit costs

| Action | Cost |
| --- | --- |
| Render Final Ink (Studio) | 1 credit |
| Save refined PNG (Workbench) | 1 credit |
| Live preview, watermarked export | Free |

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
