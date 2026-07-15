import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, validatePassword } from "@/lib/auth/password";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { sessionUserFromDb } from "@/lib/auth/session-user";
import { buildMobileAuthResponse } from "@/lib/mobile-auth/response";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";
import { authRateLimit } from "@/lib/rate-limit";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
  const rl = authRateLimit(req, "register", 5, 10 * 60_000);
  if (!rl.ok) {
    return jsonWithMobileCors(
      req,
      {
        error: "Too many attempts. Try again shortly.",
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithMobileCors(
      req,
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const name = body.name?.trim() || email?.split("@")[0] || "Artist";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonWithMobileCors(
      req,
      { error: "Valid email required.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  const pwdError = validatePassword(password);
  if (pwdError) {
    return jsonWithMobileCors(
      req,
      { error: pwdError, code: "VALIDATION" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonWithMobileCors(
      req,
      { error: "An account with this email already exists.", code: "CONFLICT" },
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
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      plan: true,
      role: true,
    },
  });

  await sendVerificationEmail(user.id, user.email);

  return jsonWithMobileCors(
    req,
    await buildMobileAuthResponse(sessionUserFromDb(user)),
    { status: 201 },
  );
}
