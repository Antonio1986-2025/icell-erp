const { PrismaClient } = require("@prisma/client");

async function main() {
  console.log("🧹 Limpando todos os dados do sistema...\n");

  const prisma = new PrismaClient();
  const tenantId = process.env.TENANT_ID || await getTenantId(prisma);

  const tables = [
    { name: "TransactionPayment", fn: () => prisma.transactionPayment.deleteMany({ where: { transaction: { tenantId } } }) },
    { name: "Document", fn: () => prisma.document.deleteMany({ where: { tenantId } }) },
    { name: "AccountReceivable", fn: () => prisma.accountReceivable.deleteMany({ where: { tenantId } }) },
    { name: "AccountPayable", fn: () => prisma.accountPayable.deleteMany({ where: { tenantId } }) },
    { name: "TransactionItem", fn: () => prisma.transactionItem.deleteMany({ where: { tenantId } }) },
    { name: "InspectionReport", fn: () => prisma.inspectionReport.deleteMany({ where: { tenantId } }) },
    { name: "StockItem", fn: () => prisma.stockItem.deleteMany({ where: { tenantId } }) },
    { name: "Transaction", fn: () => prisma.transaction.deleteMany({ where: { tenantId } }) },
    { name: "ProductParent", fn: () => prisma.productParent.deleteMany({ where: { tenantId } }) },
    { name: "Conversation", fn: () => prisma.conversation.deleteMany({ where: { tenantId } }) },
    { name: "RecurringExpense", fn: () => prisma.recurringExpense.deleteMany({ where: { tenantId } }) },
    { name: "PaymentMethod", fn: () => prisma.paymentMethod.deleteMany({ where: { tenantId } }) },
    { name: "SupplierCatalog", fn: () => prisma.supplierCatalog.deleteMany({ where: { tenantId } }) },
    { name: "Client", fn: () => prisma.client.deleteMany({ where: { tenantId } }) },
    { name: "Supplier", fn: () => prisma.supplier.deleteMany({ where: { tenantId } }) },
  ];

  for (const t of tables) {
    process.stdout.write(`  ${t.name}... `);
    try {
      const r = await t.fn();
      console.log(`${r.count} deletado(s)`);
    } catch (e) {
      console.log(`erro: ${e.message}`);
    }
  }

  console.log("\n✅ Limpeza concluída!");
  console.log("⚠️  Tenant, Admin, Categorias mantidos.");
}

async function getTenantId(prisma) {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "minha-loja" } });
  if (tenant) return tenant.id;
  // fallback: pega o primeiro
  const anyTenant = await prisma.tenant.findFirst();
  if (anyTenant) return anyTenant.id;
  throw new Error("Nenhum tenant encontrado");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
