import type { Prisma } from "@prisma/client";
import { deductCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PLAN } from "@/lib/constants";

const PERIOD_DAYS = 30;

function addPeriodDays(from: Date, months = 1): Date {
  return new Date(from.getTime() + months * PERIOD_DAYS * 24 * 3600 * 1000);
}

/** Grant subscription period: credits + plan + subscriptionEnd (B2 applyPurchase pattern). */
export async function applySubscriptionPeriod(input: {
  userId: string;
  plan?: string;
  credits?: number;
  months?: number;
  sourcePurchaseId?: string;
  contractId?: string;
}): Promise<void> {
  const plan = input.plan ?? SUBSCRIPTION_PLAN.plan;
  const credits = input.credits ?? SUBSCRIPTION_PLAN.creditsPerMonth;
  const months = input.months ?? 1;

  await prisma.$transaction((tx) => applyWithin(tx, input, plan, credits, months));
}

/** Same grant, but joining a caller's transaction so the purchase claim and the
 *  grant commit together. */
export async function applySubscriptionPeriodWithin(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    plan?: string;
    credits?: number;
    months?: number;
    sourcePurchaseId?: string;
    contractId?: string;
  },
): Promise<void> {
  return applyWithin(
    tx,
    input,
    input.plan ?? SUBSCRIPTION_PLAN.plan,
    input.credits ?? SUBSCRIPTION_PLAN.creditsPerMonth,
    input.months ?? 1,
  );
}

async function applyWithin(
  tx: Prisma.TransactionClient,
  input: { userId: string; sourcePurchaseId?: string; contractId?: string },
  plan: string,
  credits: number,
  months: number,
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { subscriptionEnd: true },
  });
  if (!user) return;

  const now = new Date();
  const active = user.subscriptionEnd && user.subscriptionEnd > now;
  const base = active ? user.subscriptionEnd! : now;
  const periodEnd = addPeriodDays(base, months);

  await tx.user.update({
    where: { id: input.userId },
    data: {
      plan,
      subscriptionEnd: periodEnd,
      ...(credits > 0 ? { credits: { increment: credits } } : {}),
    },
  });

  if (credits > 0) {
    await tx.creditTransaction.create({
      data: {
        userId: input.userId,
        amount: credits,
        reason: `subscription_${input.sourcePurchaseId ?? "period"}`,
      },
    });
  }

  await tx.subscriptionRecord.create({
    data: {
      userId: input.userId,
      plan,
      creditsGranted: credits,
      periodEnd,
      sourcePurchaseId: input.sourcePurchaseId ?? null,
      contractId: input.contractId ?? null,
    },
  });

  if (input.contractId) {
    await tx.payContract.updateMany({
      where: { id: input.contractId, userId: input.userId },
      data: {
        lastChargeAt: now,
        nextChargeAt: periodEnd,
        failedCount: 0,
        status: "active",
      },
    });
  }
}

/** Roll back credits and shorten subscription after refund. */
export async function revokeSubscriptionPurchase(input: {
  purchaseId: string;
  creditsToClawBack: number;
  revokePeriod?: boolean;
}): Promise<void> {
  const purchase = await prisma.creditPurchase.findUnique({
    where: { id: input.purchaseId },
    select: { userId: true, purchaseType: true },
  });
  if (!purchase) return;

  if (input.creditsToClawBack > 0) {
    const user = await prisma.user.findUnique({
      where: { id: purchase.userId },
      select: { credits: true },
    });
    const claw = Math.min(user?.credits ?? 0, input.creditsToClawBack);
    if (claw > 0) {
      await deductCredits(
        purchase.userId,
        claw,
        `refund_clawback_${input.purchaseId}`,
      );
    }
  }

  if (purchase.purchaseType === "subscription" && input.revokePeriod !== false) {
    const user = await prisma.user.findUnique({
      where: { id: purchase.userId },
      select: { subscriptionEnd: true },
    });
    const end = user?.subscriptionEnd
      ? new Date(user.subscriptionEnd.getTime() - PERIOD_DAYS * 24 * 3600 * 1000)
      : null;
    const demote =
      !end || end <= new Date()
        ? { plan: "free", subscriptionEnd: null }
        : { subscriptionEnd: end };
    await prisma.user.update({
      where: { id: purchase.userId },
      data: demote,
    });
  }
}
