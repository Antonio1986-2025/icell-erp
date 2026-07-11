-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN "dataFimGarantia" TIMESTAMP(3);
ALTER TABLE "StockItem" ADD COLUMN "ultimaTransacaoId" TEXT;
ALTER TABLE "StockItem" ADD COLUMN "ultimaTransacaoTipo" TEXT;
