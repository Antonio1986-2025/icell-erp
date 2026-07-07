-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "logoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VENDEDOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "comissao" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hasImei" BOOLEAN NOT NULL DEFAULT false,
    "hasBattery" BOOLEAN NOT NULL DEFAULT false,
    "hasSerial" BOOLEAN NOT NULL DEFAULT false,
    "hasWarranty" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductParent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "imei" TEXT,
    "serialNumber" TEXT,
    "condicao" TEXT,
    "nivelBateria" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'EM_ESTOQUE',
    "cor" TEXT,
    "capacidade" TEXT,
    "precoVenda" REAL,
    "precoCusto" REAL,
    "fornecedorId" TEXT,
    "acessoriosInclusos" TEXT,
    "dataEntrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVenda" DATETIME,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductParent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockItem_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "dataNascimento" DATETIME,
    "observacoes" TEXT,
    "totalCompras" REAL NOT NULL DEFAULT 0,
    "ultimaCompra" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "prazoMedio" INTEGER,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT,
    "fornecedorId" TEXT,
    "vendedorId" TEXT,
    "criadorId" TEXT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "desconto" REAL NOT NULL DEFAULT 0,
    "taxaEntrega" REAL NOT NULL DEFAULT 0,
    "frete" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "custoTotal" REAL NOT NULL DEFAULT 0,
    "lucro" REAL NOT NULL DEFAULT 0,
    "lucroPercentual" REAL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_criadorId_fkey" FOREIGN KEY ("criadorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "parentId" TEXT,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnit" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "TransactionItem_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductParent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "qrCodeUrl" TEXT,
    "assinadoDigitalmente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountPayable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "dataVencimento" DATETIME NOT NULL,
    "dataPagamento" DATETIME,
    "categoria" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "fornecedorId" TEXT,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountPayable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountReceivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "dataVencimento" DATETIME NOT NULL,
    "dataRecebimento" DATETIME,
    "categoria" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "transacaoId" TEXT,
    "clienteId" TEXT,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountReceivable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountReceivable_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AccountReceivable_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "categoria" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "responsavelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringExpense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringExpense_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT,
    "contato" TEXT NOT NULL,
    "mensagens" TEXT,
    "contexto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ProductParent_tenantId_categoriaId_idx" ON "ProductParent"("tenantId", "categoriaId");

-- CreateIndex
CREATE INDEX "StockItem_tenantId_parentId_idx" ON "StockItem"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "StockItem_tenantId_imei_idx" ON "StockItem"("tenantId", "imei");

-- CreateIndex
CREATE INDEX "StockItem_tenantId_status_idx" ON "StockItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Client_tenantId_cpf_idx" ON "Client"("tenantId", "cpf");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_cnpj_idx" ON "Supplier"("tenantId", "cnpj");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_tipo_idx" ON "Transaction"("tenantId", "tipo");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_status_idx" ON "Transaction"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_tenantId_tipo_numero_key" ON "Transaction"("tenantId", "tipo", "numero");

-- CreateIndex
CREATE INDEX "TransactionItem_tenantId_transacaoId_idx" ON "TransactionItem"("tenantId", "transacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_tenantId_tipo_numero_key" ON "Document"("tenantId", "tipo", "numero");

-- CreateIndex
CREATE INDEX "AccountPayable_tenantId_status_idx" ON "AccountPayable"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AccountReceivable_tenantId_status_idx" ON "AccountReceivable"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RecurringExpense_tenantId_ativo_idx" ON "RecurringExpense"("tenantId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_tenantId_nome_key" ON "PaymentMethod"("tenantId", "nome");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_status_idx" ON "Conversation"("tenantId", "status");
