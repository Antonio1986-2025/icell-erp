-- CreateTable
CREATE TABLE "DeviceModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "tac" TEXT NOT NULL,
    "specs" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceModel_tac_key" ON "DeviceModel"("tac");

-- CreateIndex
CREATE INDEX "DeviceModel_tac_idx" ON "DeviceModel"("tac");
