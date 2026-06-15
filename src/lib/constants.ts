/** Credit costs for premium (server-backed) actions. */
export const CREDIT_COST = {
  GENERATE_FINAL: 1,
  SVG_EXPORT: 1,
  AI_TUNE: 1,
  SAVE_SIGNATURE: 1,
  TEMPLATE_UNLOCK: 1,
  SIGN_PDF: 1,
} as const;

/** AI natural-language tune: charge 1 credit every N uses. */
export const AI_TUNE_USES_PER_CREDIT = 3;

export const FREE_STARTER_CREDITS = 5;

/** Human-readable rows for Pricing + Account. */
export const CREDIT_USAGE_ITEMS = [
  { action: "Render Final Ink (HD PNG)", cost: CREDIT_COST.GENERATE_FINAL, free: false },
  { action: "Refinement Workbench (PNG export)", cost: 0, free: true },
  { action: "SVG vector export", cost: CREDIT_COST.SVG_EXPORT, free: false },
  {
    action: `AI natural language tune (every ${AI_TUNE_USES_PER_CREDIT} uses)`,
    cost: CREDIT_COST.AI_TUNE,
    free: false,
  },
  {
    action: "Save to cloud (free templates)",
    cost: 0,
    free: true,
  },
  {
    action: "Save to cloud (premium templates)",
    cost: CREDIT_COST.SAVE_SIGNATURE,
    free: false,
  },
  { action: "Premium template unlock (permanent)", cost: CREDIT_COST.TEMPLATE_UNLOCK, free: false },
  { action: "Sign PDF (SES — Simple E-Signature)", cost: CREDIT_COST.SIGN_PDF, free: false },
  { action: "Live preview & watermarked export", cost: 0, free: true },
  { action: "10 free signature templates", cost: 0, free: true },
] as const;

/** Stripe credit packs (test mode uses inline price_data if price IDs unset). */
export const CREDIT_PACKS = [
  {
    id: "pack_10",
    credits: 10,
    label: "10 Credits",
    priceUsd: 0.58,
    description: "Try final ink, cloud saves, and PDF signing.",
  },
  {
    id: "pack_50",
    credits: 50,
    label: "50 Credits",
    priceUsd: 1,
    description: "Best for regular studio use.",
    popular: true,
  },
  {
    id: "pack_200",
    credits: 200,
    label: "200 Credits",
    priceUsd: 1.5,
    description: "Volume pricing — includes commercial export rights.",
  },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

/** Monthly subscription (Stripe recurring). Requires STRIPE_PRICE_PRO_MONTHLY. */
export const SUBSCRIPTION_PLAN = {
  id: "pro_monthly",
  plan: "pro",
  label: "Studio Pro Monthly",
  priceUsd: 9.99,
  creditsPerMonth: 50,
  description: "50 credits every month + Pro plan badge. Cancel anytime.",
} as const;

export function subscriptionStripePriceId(): string | null {
  const id = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  return id && id.length > 0 ? id : null;
}

/** SES legal disclaimer shown before signing. */
export const SES_DISCLAIMER =
  "Simple Electronic Signature (SES): suitable for everyday documents. It is not a Qualified Electronic Signature (QES) and may not equal a handwritten signature in all jurisdictions.";

/** Display tiers for the /pricing page (features only; credits sold separately). */
export const PRICING_TIERS = [
  {
    id: "guest",
    name: "Studio Guest",
    priceLabel: "Free",
    priceUsd: 0,
    period: "",
    description: "Explore the atelier with live previews.",
    features: [
      "Live signature preview",
      "10 free signature templates",
      "40 premium templates (1 cr unlock)",
      "Refinement Workbench (free export)",
    ],
    cta: "Start Crafting",
    href: "/studio",
    highlighted: false,
  },
  {
    id: "artist",
    name: "Artist",
    priceLabel: "Pay as you go",
    priceUsd: null,
    period: "credits",
    description: "Purchase credits when you need final ink, cloud saves, or PDF signing.",
    features: [
      "Everything in Guest",
      "Render Final Ink (1 cr)",
      "Free template cloud save (0 cr)",
      "Premium cloud save (1 cr) · unlock (1 cr)",
      "Sign PDF — SES (1 cr)",
      `AI tune (${AI_TUNE_USES_PER_CREDIT} uses = 1 cr) & SVG (1 cr)`,
    ],
    cta: "View credit packs",
    href: "#credit-packs",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Studio Pro",
    priceLabel: "$9.99/mo",
    priceUsd: 9.99,
    period: "subscription",
    description: "Monthly subscription with 50 credits per period and Pro plan status.",
    features: [
      "Everything in Artist",
      "50 credits every month",
      "Pro plan badge on account",
      "Manage billing in Stripe portal",
      "Cancel anytime",
    ],
    cta: "Subscribe",
    href: "#subscription",
    highlighted: false,
  },
] as const;
