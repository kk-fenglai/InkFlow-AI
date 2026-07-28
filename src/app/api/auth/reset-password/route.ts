import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/auth/password";
import { authRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = authRateLimit(req, "reset-password", 10, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "Too many attempts. Try again later.",
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawToken = String(body.token ?? "");
  const password = String(body.password ?? "");

  const pwdError = validatePassword(password);
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 });
  }

  if (!rawToken) {
    return NextResponse.json({ error: "Reset token required." }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invalid or expired reset link." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    // Burn every outstanding reset link, not just this one, and cut existing
    // mobile sessions — a reset is how a user locks an intruder out.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.mobileRefreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true, message: "Password updated. You can sign in." });
}
