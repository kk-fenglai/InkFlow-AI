import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}
process.env.INKFLOW_DATABASE_URL = env.INKFLOW_DATABASE_URL;

const prisma = new PrismaClient();
const wrong = "dengfenglai1210@gamil.com";
const correct = "dengfenglai1210@gmail.com";

const existing = await prisma.user.findUnique({ where: { email: wrong } });
if (!existing) {
  console.log("User with typo email not found");
  await prisma.$disconnect();
  process.exit(1);
}

const clash = await prisma.user.findUnique({ where: { email: correct } });
if (clash) {
  console.log("Correct email already taken by another account");
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.user.update({
  where: { id: existing.id },
  data: { email: correct },
});
console.log("Updated email:", wrong, "->", correct);

const rawToken = crypto.randomBytes(32).toString("hex");
const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
await prisma.passwordResetToken.create({
  data: {
    userId: existing.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

const resetUrl = `https://ink-flow-ai-nine.vercel.app/reset-password?token=${rawToken}`;
console.log("reset_url:", resetUrl);
await prisma.$disconnect();
