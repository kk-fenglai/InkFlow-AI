import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { deductCredits } from "@/lib/credits";
import { rateLimit, creditActionKey } from "@/lib/rate-limit";

type GuardOk = {
  ok: true;
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  remaining: number;
};

type GuardFail = {
  ok: false;
  response: NextResponse;
};

/** Auth, rate limit, and credit deduction for premium API actions. */
export async function guardCreditAction(
  cost: number,
  reason: string,
  action: string,
  limitPerMin = 30,
): Promise<GuardOk | GuardFail> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required.", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const rl = rateLimit(creditActionKey(user.id, action), limitPerMin, 60_000);
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Too many requests. Try again shortly.",
          code: "RATE_LIMITED",
          retryAfterSec: rl.retryAfterSec,
        },
        { status: 429 },
      ),
    };
  }

  const deducted = await deductCredits(user.id, cost, reason);
  if (!deducted.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Not enough credits.",
          code: "INSUFFICIENT_CREDITS",
          credits: deducted.remaining,
        },
        { status: 402 },
      ),
    };
  }

  return { ok: true, user, remaining: deducted.remaining };
}
