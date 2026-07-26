-- AlterTable
ALTER TABLE "CreditPurchase" ADD COLUMN "googlePurchaseToken" TEXT;
ALTER TABLE "CreditPurchase" ADD COLUMN "googleOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_googlePurchaseToken_key" ON "CreditPurchase"("googlePurchaseToken");
