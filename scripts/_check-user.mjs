import { PrismaClient } from "@prisma/client";
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

const email = "dengfenglai1210@gmail.com";
const user = await prisma.user.findUnique({ where: { email } });
console.log("user:", user ? { id: user.id, email: user.email, name: user.name } : "NOT FOUND");

const tokens = user
  ? await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { createdAt: true, expiresAt: true, usedAt: true },
    })
  : [];
console.log("recent reset tokens:", tokens);

await prisma.$disconnect();
