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

const email = process.argv[2] ?? "dengfenglai1210@gmail.com";
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
if (!user) {
  console.log("NOT FOUND:", email);
  await prisma.$disconnect();
  process.exit(1);
}

const rawToken = crypto.randomBytes(32).toString("hex");
const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
await prisma.passwordResetToken.create({
  data: {
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

const base = "https://signaturegeneratorai.vercel.app";
console.log("reset_url:", `${base}/reset-password?token=${rawToken}`);
await prisma.$disconnect();
