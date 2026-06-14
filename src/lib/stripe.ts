import Stripe from "stripe";
import { CREDIT_PACKS, type CreditPackId } from "@/lib/constants";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.length < 10) return null;
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

export function getPack(packId: string) {
  return CREDIT_PACKS.find((p) => p.id === packId);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

export function packIdToCredits(packId: CreditPackId): number {
  const pack = getPack(packId);
  return pack?.credits ?? 0;
}
