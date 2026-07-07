// Script para criar pré-venda de teste localmente
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.log("Sem tenant"); return; }

  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!admin) { console.log("Sem admin"); return; }

  const produto = await prisma.productParent.findFirst({ where: { tenantId: tenant.id } });
  if (!produto) { console.log("Sem produto"); return; }

  const cliente = await prisma.client.findFirst({ where: { tenantId: tenant.id } });
  if (!cliente) { console.log("Sem cliente"); return; }

  console.log(`Tenant: ${tenant.id}`);
  console.log(`Admin: ${admin.id} (${admin.nome})`);
  console.log(`Produto: ${produto.id} - ${produto.nome} - R$ ${produto.precoVenda}`);
  console.log(`Cliente: ${cliente.id} - ${cliente.nome}`);

  // Criar pré-venda
  const subtotal = produto.precoVenda || 0;
  const ultima = await prisma.transaction.findFirst({
    where: { tenantId: tenant.id, tipo: "VENDA" },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = (ultima?.numero || 0) + 1;

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        tenantId: tenant.id,
        tipo: "VENDA",
        numero,
        clienteId: cliente.id,
        vendedorId: admin.id,
        criadorId: admin.id,
        status: "PRE_VENDA",
        subtotal,
        desconto: 0,
        total: subtotal,
        custoTotal: 0,
        lucro: 0,
        observacoes: `Pré-venda | COR: | CAP: | COND:NOVO`,
      },
    });

    await tx.transactionItem.create({
      data: {
        tenantId: tenant.id,
        transacaoId: t.id,
        parentId: produto.id,
        tipo: "SAIDA",
        quantidade: 1,
        precoUnit: subtotal,
        subtotal,
      },
    });

    return t;
  });

  console.log(`\n✅ Pré-venda criada! ID: ${transaction.id}, Numero: ${transaction.numero}`);
  console.log(`Produto: ${produto.nome} - R$ ${subtotal}`);
  console.log(`Cliente: ${cliente.nome}`);
  console.log(`Status: ${transaction.status}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
