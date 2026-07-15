import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, validatePassword } from "@/lib/auth/password";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { authRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = authRateLimit(req, "register", 5, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly.", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const name = body.name?.trim() || email?.split("@")[0] || "Artist";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const pwdError = validatePassword(password);
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Welcome credits are granted when the user verifies their email.
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      credits: 0,
      emailVerifiedAt: null,
    },
  });

  const verification = await sendVerificationEmail(user.id, user.email);

  return NextResponse.json({
    ok: true,
    email: user.email,
    message:
      "Account created. Check your email to verify and claim your free credits.",
    ...(verification.devVerifyUrl
      ? { devVerifyUrl: verification.devVerifyUrl }
      : {}),
  });
}
