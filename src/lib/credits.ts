import { prisma } from "@/lib/prisma";

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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.credits < amount) {
    return { ok: false, remaining: user?.credits ?? 0 };
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });
  await prisma.creditTransaction.create({
    data: { userId, amount: -amount, reason },
  });
  return { ok: true, remaining: updated.credits };
}
