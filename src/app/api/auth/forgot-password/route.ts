import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth/password";
import { appOrigin } from "@/lib/payments/urls";
import { passwordResetEmailHtml, sendEmail } from "@/lib/email/send";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${appOrigin()}/reset-password?token=${rawToken}`;

    if (process.env.NODE_ENV === "development") {
      console.info("[InkFlow] Password reset link:", resetUrl);
      return NextResponse.json({
        ok: true,
        message: "If the email exists, a reset link was sent.",
        devResetUrl: resetUrl,
      });
    }

    const sent = await sendEmail({
      to: email,
      subject: "Reset your InkFlow AI password",
      html: passwordResetEmailHtml(resetUrl),
      text: `Reset your InkFlow AI password: ${resetUrl}\n\nLink expires in 1 hour.`,
    });

    if (!sent.ok) {
      console.error("[forgot-password] email failed:", sent.error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If the email exists, a reset link was sent.",
  });
}
