const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const t = await p.tenant.findFirst();
  const u = await p.user.findFirst({ where: { tenantId: t.id } });
  const pr = await p.productParent.findFirst({ where: { tenantId: t.id } });
  const c = await p.client.findFirst({ where: { tenantId: t.id } });

  const last = await p.transaction.findFirst({
    where: { tenantId: t.id, tipo: 'VENDA' },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const num = (last?.numero || 0) + 1;

  const tx = await p.$transaction(async (tx) => {
    const v = await tx.transaction.create({
      data: {
        tenantId: t.id, tipo: 'VENDA', numero: num,
        clienteId: c.id, vendedorId: u.id, criadorId: u.id,
        status: 'PRE_VENDA',
        subtotal: pr.precoVenda || 8999,
        desconto: 0,
        total: pr.precoVenda || 8999,
        custoTotal: 0, lucro: 0,
        observacoes: 'Pre-venda teste modal fornecedor',
      },
    });
    await tx.transactionItem.create({
      data: {
        tenantId: t.id, transacaoId: v.id,
        parentId: pr.id, tipo: 'SAIDA',
        quantidade: 1,
        precoUnit: pr.precoVenda || 8999,
        subtotal: pr.precoVenda || 8999,
      },
    });
    return v;
  });

  console.log('OK ID=' + tx.id + ' NUM=' + tx.numero);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
