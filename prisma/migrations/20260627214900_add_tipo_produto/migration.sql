-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductParent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'NOVO',
    "descricao" TEXT,
    "precoVenda" REAL,
    "precoCusto" REAL,
    "sku" TEXT,
    "garantiaPadrao" INTEGER,
    "especificacoes" TEXT,
    "fotos" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductParent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductParent_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductParent" ("ativo", "categoriaId", "createdAt", "descricao", "especificacoes", "fotos", "garantiaPadrao", "id", "marca", "modelo", "nome", "precoCusto", "precoVenda", "sku", "tenantId", "updatedAt") SELECT "ativo", "categoriaId", "createdAt", "descricao", "especificacoes", "fotos", "garantiaPadrao", "id", "marca", "modelo", "nome", "precoCusto", "precoVenda", "sku", "tenantId", "updatedAt" FROM "ProductParent";
DROP TABLE "ProductParent";
ALTER TABLE "new_ProductParent" RENAME TO "ProductParent";
CREATE INDEX "ProductParent_tenantId_categoriaId_idx" ON "ProductParent"("tenantId", "categoriaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
