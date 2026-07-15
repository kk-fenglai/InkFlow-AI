import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Sign in required.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const rl = rateLimit(`resend-verification:${sessionUser.id}`, 3, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly.", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Email is already verified.", code: "ALREADY_VERIFIED" },
      { status: 400 },
    );
  }

  const verification = await sendVerificationEmail(user.id, user.email);
  if (!verification.ok) {
    return NextResponse.json(
      { error: "Could not send the email. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Verification email sent.",
    ...(verification.devVerifyUrl
      ? { devVerifyUrl: verification.devVerifyUrl }
      : {}),
  });
}
