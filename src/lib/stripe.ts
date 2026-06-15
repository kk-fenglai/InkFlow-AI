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
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key.startsWith("sk_")) return false;
  if (key.length < 24) return false;
  if (key.includes("...")) return false;
  return true;
}

export function packIdToCredits(packId: CreditPackId): number {
  const pack = getPack(packId);
  return pack?.credits ?? 0;
}
