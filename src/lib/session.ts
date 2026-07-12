import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sessionUserFromDb, type SessionUser } from "@/lib/auth/session-user";
import { verifyAccessToken } from "@/lib/mobile-auth/tokens";
import { prisma } from "@/lib/prisma";

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  return getAuthenticatedUser();
}

/** Web session (NextAuth cookie) or mobile Bearer access token. */
export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  const authHeader = headers().get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const userId = await verifyAccessToken(token);
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          plan: true,
          role: true,
        },
      });
      if (user) {
        return sessionUserFromDb(user);
      }
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    credits: session.user.credits ?? 0,
    plan: session.user.plan ?? "free",
    role: session.user.role ?? "user",
  };
}

async function loadUserAuthPayload(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      plan: true,
      role: true,
    },
  });
}

export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const { default: bcrypt } = await import("bcryptjs");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return sessionUserFromDb(user);
}

export { loadUserAuthPayload };
