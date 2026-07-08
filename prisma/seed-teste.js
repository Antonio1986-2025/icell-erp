// Seed de dados de teste - executado pelo docker-entrypoint.sh
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Gerando dados de teste...");

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log("⚠️  Nenhum tenant encontrado. Pulando dados de teste.");
    return;
  }
  const tid = tenant.id;

  // Verificar se já existem produtos
  const produtosExistentes = await prisma.productParent.count({ where: { tenantId: tid } });
  if (produtosExistentes > 0) {
    console.log(`✅ ${produtosExistentes} produtos já existentes. Pulando geração de dados completos.`);
    // Ainda tenta criar laudos se não existirem
    await criarLaudos(tid);
    return;
  }

  console.log(`✅ Tenant: ${tenant.nome} (${tid})`);

  const categorias = await prisma.category.findMany({ where: { tenantId: tid } });
  const catIds = categorias.map((c) => c.id);
  const catPrincipal = catIds[0];

  // Produtos
  const produtosData = [
    { nome: "iPhone 15 Pro Max 256GB", marca: "Apple", precoVenda: 8999, precoCusto: 7500 },
    { nome: "iPhone 15 Pro 128GB", marca: "Apple", precoVenda: 7499, precoCusto: 6200 },
    { nome: "Samsung Galaxy S24 Ultra", marca: "Samsung", precoVenda: 6999, precoCusto: 5800 },
    { nome: "Motorola Edge 40 Pro", marca: "Motorola", precoVenda: 3999, precoCusto: 3200 },
    { nome: "Xiaomi Redmi Note 13", marca: "Xiaomi", precoVenda: 1599, precoCusto: 1200 },
    { nome: "Capa Silicone iPhone 15", marca: "Genérica", precoVenda: 49, precoCusto: 15 },
    { nome: "Película Vidro Premium", marca: "Premium Glass", precoVenda: 29, precoCusto: 8 },
    { nome: "Carregador Turbo 30W", marca: "Xiaomi", precoVenda: 89, precoCusto: 35 },
    { nome: "Fone Bluetooth TWS", marca: "Xiaomi", precoVenda: 149, precoCusto: 80 },
    { nome: "Power Bank 20000mAh", marca: "Xiaomi", precoVenda: 129, precoCusto: 65 },
  ];

  const produtos = [];
  for (const p of produtosData) {
    const criado = await prisma.productParent.create({
      data: {
        tenantId: tid,
        nome: p.nome,
        marca: p.marca,
        tipo: "NOVO",
        precoVenda: p.precoVenda,
        precoCusto: p.precoCusto,
        sku: "SKU-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        categoriaId: catPrincipal,
        garantiaPadrao: 12,
        ativo: true,
      },
    });
    produtos.push(criado);
  }
  console.log(`  ✅ ${produtos.length} produtos criados`);

  // Estoque
  for (const p of produtos) {
    const qtd = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < qtd; i++) {
      await prisma.stockItem.create({
        data: {
          tenantId: tid,
          parentId: p.id,
          status: "EM_ESTOQUE",
          condicao: "NOVO",
          precoVenda: p.precoVenda,
          precoCusto: p.precoCusto,
          cor: ["Preto", "Branco", "Azul"][Math.floor(Math.random() * 3)],
          dataEntrada: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log(`  📦 Itens em estoque criados`);

  // Clientes
  const clientesData = [
    { nome: "Carlos Santos", telefone: "(11) 99999-0001" },
    { nome: "Maria Oliveira", telefone: "(11) 99999-0002" },
    { nome: "João Pereira", telefone: "(11) 99999-0003" },
    { nome: "Ana Costa", telefone: "(11) 99999-0004" },
    { nome: "Pedro Souza", telefone: "(11) 99999-0005" },
    { nome: "Lucia Ferreira", telefone: "(11) 99999-0006" },
    { nome: "Roberto Lima", telefone: "(11) 99999-0007" },
  ];

  const clientes = [];
  for (const c of clientesData) {
    const criado = await prisma.client.create({
      data: {
        tenantId: tid,
        nome: c.nome,
        telefone: c.telefone,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      },
    });
    clientes.push(criado);
  }
  console.log(`  👤 ${clientes.length} clientes criados`);

  // Fornecedores
  const fornecedoresData = [
    { nome: "Distribuidora Tech Brasil", contato: "Carlos" },
    { nome: "Importadora Smart Ltda", contato: "Maria" },
    { nome: "Acessórios Plus", contato: "João" },
  ];
  for (const f of fornecedoresData) {
    await prisma.supplier.create({
      data: { tenantId: tid, nome: f.nome, contato: f.contato, prazoMedio: 30 },
    });
  }
  console.log(`  🏭 ${fornecedoresData.length} fornecedores criados`);

  // Contas a pagar
  const contas = [
    { descricao: "Aluguel da Loja", valor: 3500, categoria: "ALUGUEL" },
    { descricao: "Energia Elétrica", valor: 450, categoria: "UTILIDADES" },
    { descricao: "Internet + Telefone", valor: 299, categoria: "UTILIDADES" },
    { descricao: "Compra Fornecedor - iPhones", valor: 45000, categoria: "ESTOQUE" },
  ];
  for (const c of contas) {
    await prisma.accountPayable.create({
      data: {
        tenantId: tid,
        descricao: c.descricao,
        valor: c.valor,
        dataVencimento: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        categoria: c.categoria,
        status: "PENDENTE",
      },
    });
  }
  console.log(`  💳 ${contas.length} contas a pagar criadas`);

  // Vendas históricas
  const formasPagamento = ["💵 Dinheiro", "📱 PIX", "💳 Crédito", "💳 Débito"];
  const stockItems = await prisma.stockItem.findMany({
    where: { tenantId: tid, status: "EM_ESTOQUE" },
    include: { parent: true },
  });

  let ultimoNumero = 0;
  for (let i = 0; i < 15; i++) {
    const diasAtras = Math.floor(Math.random() * 90) + 1;
    const dataVenda = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
    const qtdItens = Math.floor(Math.random() * 2) + 1;
    const itensVenda = stockItems.sort(() => Math.random() - 0.5).slice(0, qtdItens);

    const subtotal = itensVenda.reduce((s, item) => s + (item.precoVenda || 0), 0);
    const custoTotal = itensVenda.reduce((s, item) => s + (item.precoCusto || 0), 0);
    const desconto = Math.random() > 0.7 ? subtotal * 0.05 : 0;
    const total = subtotal - desconto;
    const cliente = clientes[Math.floor(Math.random() * clientes.length)];
    const metodo = formasPagamento[Math.floor(Math.random() * formasPagamento.length)];

    ultimoNumero++;
    const venda = await prisma.transaction.create({
      data: {
        tenantId: tid,
        tipo: "VENDA",
        numero: ultimoNumero,
        clienteId: cliente.id,
        status: "CONCLUIDA",
        subtotal,
        desconto,
        total,
        custoTotal,
        lucro: total - custoTotal,
        data: dataVenda,
        payments: { create: { metodo, valor: total, parcelas: 1 } },
      },
    });

    for (const item of itensVenda) {
      await prisma.transactionItem.create({
        data: {
          tenantId: tid,
          transacaoId: venda.id,
          stockItemId: item.id,
          parentId: item.parentId,
          tipo: "PRODUTO",
          quantidade: 1,
          precoUnit: item.precoVenda || 0,
          subtotal: item.precoVenda || 0,
        },
      });
    }

    // Atualizar cliente
    const totalCliente = await prisma.transaction.aggregate({
      where: { tenantId: tid, clienteId: cliente.id, status: "CONCLUIDA" },
      _sum: { total: true },
    });
    await prisma.client.update({
      where: { id: cliente.id },
      data: { totalCompras: totalCliente._sum.total || 0, ultimaCompra: dataVenda },
    });

    if ((i + 1) % 5 === 0) console.log(`  🛒 ${i + 1} vendas criadas...`);
  }
  console.log(`  🛒 15 vendas com pagamentos criadas`);

  console.log("\n✅ Dados de teste gerados com sucesso!");
  console.log(`   📱 Produtos: ${await prisma.productParent.count({ where: { tenantId: tid } })}`);
  console.log(`   📦 Em estoque: ${await prisma.stockItem.count({ where: { tenantId: tid, status: "EM_ESTOQUE" } })}`);
  console.log(`   👤 Clientes: ${await prisma.client.count({ where: { tenantId: tid } })}`);
  console.log(`   🏭 Fornecedores: ${await prisma.supplier.count({ where: { tenantId: tid } })}`);
  console.log(`   🛒 Vendas: ${await prisma.transaction.count({ where: { tenantId: tid, tipo: "VENDA" } })}`);
  console.log(`   💳 Contas: ${await prisma.accountPayable.count({ where: { tenantId: tid } })}`);

  // Laudos de teste
  await criarLaudos(tid);
}

async function criarLaudos(tid) {
  const existentes = await prisma.inspectionReport.count({ where: { tenantId: tid } });
  if (existentes > 0) {
    console.log(`   📋 ${existentes} laudos já existentes. Pulando.`);
    return;
  }

  await prisma.inspectionReport.create({
    data: {
      tenantId: tid,
      aparelhoNome: "iPhone 14 128GB Estelar",
      marca: "Apple",
      modelo: "iPhone 14",
      imei: "358247111222444",
      serialNumber: "F2LXYZ1234",
      cor: "Estelar",
      capacidade: "128GB",
      nivelBateria: 85,
      condicao: "COMO_NOVO",
      valorEstimado: 4500.00,
      status: "PENDENTE",
      acessoriosInclusos: ["Carregador", "Caixa", "Documentos"],
    },
  });
  console.log("   📋 Laudo 1: iPhone 14 128GB Estelar (Pendente)");

  await prisma.inspectionReport.create({
    data: {
      tenantId: tid,
      aparelhoNome: "Galaxy S23 256GB Verde",
      marca: "Samsung",
      modelo: "Galaxy S23",
      imei: "358924333555777",
      serialNumber: "R5KABC5678",
      cor: "Verde",
      capacidade: "256GB",
      nivelBateria: 92,
      condicao: "BOM",
      valorEstimado: 2800.00,
      status: "CONCLUIDO",
      acessoriosInclusos: ["Carregador", "Cabo USB"],
    },
  });
  console.log("   📋 Laudo 2: Galaxy S23 256GB Verde (Concluído)");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed de teste:", e.message);
  })
  .finally(() => prisma.$disconnect());
