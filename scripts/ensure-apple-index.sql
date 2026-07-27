-- The 20250717120000 migration half-applied (column created, then failed).
-- Recreate its index idempotently so marking the migration applied loses nothing.
CREATE INDEX IF NOT EXISTS "CreditPurchase_appleOriginalTransactionId_idx"
  ON "CreditPurchase"("appleOriginalTransactionId");
