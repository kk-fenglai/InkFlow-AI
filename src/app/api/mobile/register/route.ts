import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { FREE_STARTER_CREDITS } from "@/lib/constants";
import { normalizeEmail, validatePassword } from "@/lib/auth/password";
import { sessionUserFromDb } from "@/lib/auth/session-user";
import { buildMobileAuthResponse } from "@/lib/mobile-auth/response";
import {
  jsonWithMobileCors,
  mobileOptionsResponse,
} from "@/lib/mobile-auth/cors";

export async function OPTIONS(req: Request) {
  return mobileOptionsResponse(req);
}

export async function POST(req: Request) {
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
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      credits: FREE_STARTER_CREDITS,
      emailVerifiedAt: new Date(),
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

  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      amount: FREE_STARTER_CREDITS,
      reason: "welcome_bonus",
    },
  });

  return jsonWithMobileCors(
    req,
    await buildMobileAuthResponse(sessionUserFromDb(user)),
    { status: 201 },
  );
}
