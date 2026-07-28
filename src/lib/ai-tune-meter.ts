import { AI_TUNE_USES_PER_CREDIT } from "@/lib/constants";
import { deductCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function chargeAiTuneUse(userId: string): Promise<
  | { ok: true; creditsRemaining: number; usesUntilCharge: number; charged: boolean }
  | { ok: false; creditsRemaining: number; usesUntilCharge: number }
> {
  const exists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!exists) {
    return { ok: false, creditsRemaining: 0, usesUntilCharge: AI_TUNE_USES_PER_CREDIT };
  }

  // Atomic increment: concurrent tunes each get a distinct count instead of
  // both reading the same value.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { aiTuneUseCount: { increment: 1 } },
    select: { credits: true, aiTuneUseCount: true },
  });

  // Exactly one caller wins this conditional reset, so a full meter charges once.
  const claim = await prisma.user.updateMany({
    where: { id: userId, aiTuneUseCount: { gte: AI_TUNE_USES_PER_CREDIT } },
    data: { aiTuneUseCount: 0 },
  });

  if (claim.count === 0) {
    return {
      ok: true,
      creditsRemaining: user.credits,
      usesUntilCharge: Math.max(
        0,
        AI_TUNE_USES_PER_CREDIT - user.aiTuneUseCount,
      ),
      charged: false,
    };
  }

  const deducted = await deductCredits(userId, 1, "ai_natural_language_tune");
  if (!deducted.ok) {
    // Give the meter back rather than silently resetting an unpaid cycle.
    await prisma.user.update({
      where: { id: userId },
      data: { aiTuneUseCount: { increment: AI_TUNE_USES_PER_CREDIT } },
    });
    return {
      ok: false,
      creditsRemaining: deducted.remaining,
      usesUntilCharge: 0,
    };
  }

  return {
    ok: true,
    creditsRemaining: deducted.remaining,
    usesUntilCharge: AI_TUNE_USES_PER_CREDIT,
    charged: true,
  };
}
