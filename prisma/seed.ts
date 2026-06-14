import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoEmail = "studio@inkflow.ai";
  const demoPassword = "inkflow2024";
  const adminEmail = "admin@inkflow.ai";
  const adminPassword = "admin2024";

  if (!(await prisma.user.findUnique({ where: { email: demoEmail } }))) {
    const hash = await bcrypt.hash(demoPassword, 12);
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash: hash,
        name: "Studio Demo",
        credits: 10,
        plan: "free",
        role: "user",
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.creditTransaction.create({
      data: { userId: user.id, amount: 10, reason: "seed_demo" },
    });
    console.log("Demo user:", demoEmail, "/", demoPassword);
  }

  if (!(await prisma.user.findUnique({ where: { email: adminEmail } }))) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        name: "InkFlow Admin",
        credits: 100,
        plan: "pro",
        role: "admin",
        emailVerifiedAt: new Date(),
      },
    });
    console.log("Admin user:", adminEmail, "/", adminPassword);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "admin" },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
