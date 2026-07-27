// Read-only inspection of the production migration state (P3009 debugging).
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const migs = await p.$queryRawUnsafe(
    `SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs
     FROM _prisma_migrations ORDER BY started_at DESC LIMIT 8`,
  );
  console.log(JSON.stringify(migs, null, 1));
  const cols = await p.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'CreditPurchase'`,
  );
  console.log("CreditPurchase columns:", JSON.stringify(cols));
  const idx = await p.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'CreditPurchase'`,
  );
  console.log("CreditPurchase indexes:", JSON.stringify(idx));
}

main().finally(() => p.$disconnect());
