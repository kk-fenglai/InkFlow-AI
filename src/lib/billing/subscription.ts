import { addCredits, deductCredits } from "@/lib/credits";
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

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { subscriptionEnd: true },
  });
  if (!user) return;

  const now = new Date();
  const active = user.subscriptionEnd && user.subscriptionEnd > now;
  const base = active ? user.subscriptionEnd! : now;
  const periodEnd = addPeriodDays(base, months);

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      plan,
      subscriptionEnd: periodEnd,
    },
  });

  if (credits > 0) {
    await addCredits(
      input.userId,
      credits,
      `subscription_${input.sourcePurchaseId ?? "period"}`,
    );
  }

  await prisma.subscriptionRecord.create({
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
    await prisma.payContract.updateMany({
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

  if (purchase.purchaseType === "subscription") {
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
