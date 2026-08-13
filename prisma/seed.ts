import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Idempotent test accounts.
 *
 * The old seed only created a user when it was missing, so once an account
 * existed with a stale password hash the credentials silently stopped working
 * and re-seeding did nothing. Re-running now always restores a usable password
 * and a verified email; existing credits are never lowered.
 */
const ACCOUNTS = [
  {
    email: "studio@inkflow.ai",
    password: "inkflow2024",
    name: "Studio Demo",
    credits: 10,
    plan: "free",
    role: "user",
    /** Throwaway test login — always restored to the documented password. */
    resetPassword: true,
  },
  {
    email: "admin@inkflow.ai",
    password: "admin2024",
    name: "InkFlow Admin",
    credits: 100,
    plan: "pro",
    role: "admin",
    /** Never reset in place: re-seeding must not downgrade a hardened admin
     *  password back to the one published in this file. */
    resetPassword: false,
  },
];

async function main() {
  for (const account of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const existing = await prisma.user.findUnique({
      where: { email: account.email },
      select: { id: true, credits: true, emailVerifiedAt: true },
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email: account.email,
          passwordHash,
          name: account.name,
          credits: account.credits,
          plan: account.plan,
          role: account.role,
          emailVerifiedAt: new Date(),
        },
      });
      await prisma.creditTransaction.create({
        data: { userId: user.id, amount: account.credits, reason: "seed_demo" },
      });
      console.log(`created  ${account.email} / ${account.password}`);
      continue;
    }

    // Top up rather than overwrite — a seeded account that has been spending
    // credits during testing should not be reset below its starting balance.
    const topUp = Math.max(0, account.credits - existing.credits);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(account.resetPassword ? { passwordHash } : {}),
        plan: account.plan,
        role: account.role,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        ...(topUp > 0 ? { credits: account.credits } : {}),
      },
    });
    if (topUp > 0) {
      await prisma.creditTransaction.create({
        data: { userId: existing.id, amount: topUp, reason: "seed_topup" },
      });
    }
    console.log(
      account.resetPassword
        ? `restored ${account.email} / ${account.password}`
        : `kept     ${account.email} (existing password preserved)`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
