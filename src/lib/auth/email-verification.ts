import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { FREE_STARTER_CREDITS } from "@/lib/constants";
import { appOrigin } from "@/lib/payments/urls";
import { sendEmail, verificationEmailHtml } from "@/lib/email/send";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a fresh verification token and email the link.
 * Never throws — registration must succeed even if email delivery fails.
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
): Promise<{ ok: boolean; devVerifyUrl?: string }> {
  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const verifyUrl = `${appOrigin()}/verify-email?token=${rawToken}`;

    if (process.env.NODE_ENV === "development") {
      console.info("[InkFlow] Email verification link:", verifyUrl);
      return { ok: true, devVerifyUrl: verifyUrl };
    }

    const sent = await sendEmail({
      to: email,
      subject: "Verify your InkFlow AI email",
      html: verificationEmailHtml(verifyUrl, FREE_STARTER_CREDITS),
      text: `Verify your InkFlow AI email to claim your ${FREE_STARTER_CREDITS} free credits: ${verifyUrl}\n\nLink expires in 24 hours.`,
    });
    if (!sent.ok) {
      console.error("[email-verification] send failed:", sent.error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email-verification] issue failed:", err);
    return { ok: false };
  }
}

export type VerifyEmailResult =
  | { ok: true; credited: boolean; credits: number }
  | { ok: false; error: string };

/**
 * Consume a verification token. On first verification, grant the welcome
 * credits exactly once (guarded by emailVerifiedAt still being null).
 */
export async function verifyEmailToken(
  rawToken: string,
): Promise<VerifyEmailResult> {
  const token = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    return { ok: false, error: "Invalid or expired verification link." };
  }

  return prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    // Only the first successful verification flips the flag and pays out.
    const flipped = await tx.user.updateMany({
      where: { id: token.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });

    if (flipped.count === 0) {
      const user = await tx.user.findUnique({
        where: { id: token.userId },
        select: { credits: true },
      });
      return { ok: true as const, credited: false, credits: user?.credits ?? 0 };
    }

    const user = await tx.user.update({
      where: { id: token.userId },
      data: { credits: { increment: FREE_STARTER_CREDITS } },
      select: { credits: true },
    });
    await tx.creditTransaction.create({
      data: {
        userId: token.userId,
        amount: FREE_STARTER_CREDITS,
        reason: "welcome_bonus",
      },
    });

    return { ok: true as const, credited: true, credits: user.credits };
  });
}
