import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const ACCESS_TTL_SEC = 60 * 15;
const REFRESH_TTL_DAYS = 30;

function accessSecret(): Uint8Array {
  const secret =
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET or NEXTAUTH_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export type AccessTokenPayload = {
  sub: string;
  typ: "access";
};

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ typ: "access" satisfies AccessTokenPayload["typ"] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(accessSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret());
    if (payload.typ !== "access" || typeof payload.sub !== "string") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt,
    },
  });

  return raw;
}

export async function rotateRefreshToken(
  raw: string,
): Promise<{ userId: string; refreshToken: string } | null> {
  const tokenHash = hashRefreshToken(raw);
  const existing = await prisma.mobileRefreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }

  // Conditional revoke: two concurrent refreshes with the same token must not
  // both succeed and spawn independent token families.
  const claimed = await prisma.mobileRefreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0) {
    return null;
  }

  const refreshToken = await issueRefreshToken(existing.userId);
  return { userId: existing.userId, refreshToken };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashRefreshToken(raw);
  await prisma.mobileRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const MOBILE_TOKEN_TTL = {
  accessSeconds: ACCESS_TTL_SEC,
  refreshDays: REFRESH_TTL_DAYS,
} as const;
