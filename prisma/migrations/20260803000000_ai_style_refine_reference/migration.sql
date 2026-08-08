-- CreateTable
CREATE TABLE "AiStyleAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiStyleAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefineReference" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefineReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiStyleAsset_active_sortOrder_idx" ON "AiStyleAsset"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "RefineReference_active_sortOrder_idx" ON "RefineReference"("active", "sortOrder");
