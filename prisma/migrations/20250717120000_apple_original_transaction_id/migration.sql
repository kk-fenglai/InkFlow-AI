-- AlterTable
ALTER TABLE "CreditPurchase" ADD COLUMN "appleOriginalTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "CreditPurchase_appleOriginalTransactionId_idx" ON "CreditPurchase"("appleOriginalTransactionId");
