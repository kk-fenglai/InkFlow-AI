import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getSessionUserWithRole() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  // The jwt callback in auth-options already re-reads role/credits/plan/name
  // from the database on every request, so the session is fresh — no second
  // user lookup needed (each DB round-trip is expensive on serverless).
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    credits: session.user.credits,
    plan: session.user.plan,
    role: session.user.role,
  };
}

export async function requireAdmin() {
  const user = await getSessionUserWithRole();
  if (!user || user.role !== "admin") {
    return {
      ok: false as const,
      status: 403,
      error: "Admin access required.",
      code: "FORBIDDEN",
    };
  }
  return { ok: true as const, user };
}

export async function verifyAdminPassword(
  adminId: string,
  password: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export function isSubscriptionActive(
  plan: string,
  subscriptionEnd: Date | null | undefined,
): boolean {
  if (plan === "free" || !subscriptionEnd) return false;
  return subscriptionEnd > new Date();
}
