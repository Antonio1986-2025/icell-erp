-- CreateTable
CREATE TABLE "SupplierCatalog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT,
    "fornecedor" TEXT NOT NULL DEFAULT 'Fornecedor',
    "arquivoOriginal" TEXT NOT NULL,
    "tipoArquivo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSANDO',
    "extracaoErro" TEXT,
    "totalItens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCatalogItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "capacidade" TEXT,
    "precoUsd" DOUBLE PRECISION NOT NULL,
    "codigo" TEXT,
    "condicao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierCatalog_tenantId_idx" ON "SupplierCatalog"("tenantId");
CREATE INDEX "SupplierCatalog_tenantId_status_idx" ON "SupplierCatalog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SupplierCatalogItem_tenantId_idx" ON "SupplierCatalogItem"("tenantId");
CREATE INDEX "SupplierCatalogItem_catalogId_idx" ON "SupplierCatalogItem"("catalogId");
CREATE INDEX "SupplierCatalogItem_tenantId_modelo_idx" ON "SupplierCatalogItem"("tenantId", "modelo");
CREATE INDEX "SupplierCatalogItem_tenantId_descricao_idx" ON "SupplierCatalogItem"("tenantId", "descricao");

-- AddForeignKey
ALTER TABLE "SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SupplierCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
