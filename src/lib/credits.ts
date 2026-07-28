import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Credit grant that can join a caller's transaction, so a claim and its
 *  payout commit together. */
export async function addCreditsWithin(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await tx.creditTransaction.create({
    data: { userId, amount, reason },
  });
}

export async function getCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await prisma.creditTransaction.create({
    data: { userId, amount, reason },
  });
  return user.credits;
}

export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<{ ok: true; remaining: number } | { ok: false; remaining: number }> {
  // Conditional update so concurrent requests cannot both pass a balance check
  // and drive credits negative.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });
  if (claimed.count === 0) {
    return { ok: false, remaining: await getCredits(userId) };
  }
  await prisma.creditTransaction.create({
    data: { userId, amount: -amount, reason },
  });
  return { ok: true, remaining: await getCredits(userId) };
}
