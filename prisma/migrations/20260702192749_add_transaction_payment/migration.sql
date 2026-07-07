-- CreateTable
CREATE TABLE "TransactionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TransactionPayment_transactionId_idx" ON "TransactionPayment"("transactionId");
