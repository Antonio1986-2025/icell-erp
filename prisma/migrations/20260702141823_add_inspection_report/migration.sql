-- CreateTable
CREATE TABLE "InspectionReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT,
    "stockItemId" TEXT,
    "transactionId" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "aparelhoNome" TEXT NOT NULL,
    "imei" TEXT,
    "serialNumber" TEXT,
    "cor" TEXT,
    "capacidade" TEXT,
    "nivelBateria" INTEGER,
    "condicao" TEXT,
    "fotos" TEXT,
    "checklistResult" TEXT,
    "acessoriosInclusos" TEXT,
    "valorEstimado" REAL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InspectionReport_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InspectionReport_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InspectionReport_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InspectionReport_tenantId_status_idx" ON "InspectionReport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InspectionReport_tenantId_imei_idx" ON "InspectionReport"("tenantId", "imei");
