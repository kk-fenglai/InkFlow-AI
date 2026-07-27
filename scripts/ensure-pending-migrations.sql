-- Idempotent version of the two pending migrations. The prod schema was
-- previously synced with `prisma db push`, so most objects already exist;
-- this fills any gaps so both migrations can be marked applied.

-- 20250717180000_google_play_purchase
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "googlePurchaseToken" TEXT;
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "googleOrderId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "CreditPurchase_googlePurchaseToken_key"
  ON "CreditPurchase"("googlePurchaseToken");

-- 20260726000000_signed_document
CREATE TABLE IF NOT EXISTS "SignedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "byteSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignedDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SignedDocument_userId_createdAt_idx"
  ON "SignedDocument"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SignedDocument_userId_fkey'
  ) THEN
    ALTER TABLE "SignedDocument"
      ADD CONSTRAINT "SignedDocument_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
