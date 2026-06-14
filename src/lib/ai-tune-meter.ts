import { AI_TUNE_USES_PER_CREDIT } from "@/lib/constants";
import { deductCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function chargeAiTuneUse(userId: string): Promise<
  | { ok: true; creditsRemaining: number; usesUntilCharge: number; charged: boolean }
  | { ok: false; creditsRemaining: number; usesUntilCharge: number }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, aiTuneUseCount: true },
  });
  if (!user) {
    return { ok: false, creditsRemaining: 0, usesUntilCharge: AI_TUNE_USES_PER_CREDIT };
  }

  const nextCount = user.aiTuneUseCount + 1;

  if (nextCount < AI_TUNE_USES_PER_CREDIT) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiTuneUseCount: nextCount },
    });
    return {
      ok: true,
      creditsRemaining: user.credits,
      usesUntilCharge: AI_TUNE_USES_PER_CREDIT - nextCount,
      charged: false,
    };
  }

  const deducted = await deductCredits(userId, 1, "ai_natural_language_tune");
  if (!deducted.ok) {
    return {
      ok: false,
      creditsRemaining: deducted.remaining,
      usesUntilCharge: AI_TUNE_USES_PER_CREDIT - user.aiTuneUseCount,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { aiTuneUseCount: 0 },
  });

  return {
    ok: true,
    creditsRemaining: deducted.remaining,
    usesUntilCharge: AI_TUNE_USES_PER_CREDIT,
    charged: true,
  };
}
