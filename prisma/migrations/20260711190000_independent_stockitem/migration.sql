-- Migration: independent_stockitem
-- Torna StockItem independente (parentId opcional, add nome/marca/modelo/categoriaId)

-- 1. Tornar parentId opcional
ALTER TABLE "StockItem" ALTER COLUMN "parentId" DROP NOT NULL;

-- 2. Adicionar campos para celular independente
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "nome" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "marca" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "modelo" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "categoriaId" TEXT;

-- 3. Adicionar índice para categoriaId
CREATE INDEX IF NOT EXISTS "StockItem_tenantId_categoriaId_idx" ON "StockItem" ("tenantId", "categoriaId");

-- 4. Adicionar constraint de chave estrangeira
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
