import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? "studio@inkflow.ai";
  const amount = Number(process.argv[3] ?? 999);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("User not found:", email);
    process.exit(1);
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { credits: { increment: amount } },
  });
  await prisma.creditTransaction.create({
    data: { userId: user.id, amount, reason: `admin_grant_${amount}` },
  });
  console.log(`${email} credits: ${updated.credits}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
