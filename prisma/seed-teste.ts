// Script para gerar dados de teste no iCell ERP
// Executar: npx tsx prisma/seed-teste.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Gerando dados de teste...");

  const tenantId = process.env.TENANT_ID || "clr..."; // será substituído

  // Buscar tenant existente
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log("❌ Nenhum tenant encontrado. Execute o seed primeiro.");
    return;
  }
  const tid = tenant.id;
  console.log(`✅ Tenant: ${tenant.nome} (${tid})`);

  // Buscar categorias
  const categorias = await prisma.category.findMany({ where: { tenantId: tid } });
  const catSmartphone = categorias.find((c) => c.slug === "smartphones");
  const catAcessorio = categorias.find((c) => c.slug === "acessorios");

  // Criar produtos de teste
  const produtosData = [
    { nome: "iPhone 15 Pro Max 256GB", marca: "Apple", modelo: "iPhone 15 Pro Max", precoVenda: 8999, precoCusto: 7500, categoriaId: catSmartphone?.id || categorias[0]?.id },
    { nome: "iPhone 15 Pro 128GB", marca: "Apple", modelo: "iPhone 15 Pro", precoVenda: 7499, precoCusto: 6200, categoriaId: catSmartphone?.id || categorias[0]?.id },
    { nome: "Samsung Galaxy S24 Ultra", marca: "Samsung", modelo: "S24 Ultra", precoVenda: 6999, precoCusto: 5800, categoriaId: catSmartphone?.id || categorias[0]?.id },
    { nome: "Motorola Edge 40 Pro", marca: "Motorola", modelo: "Edge 40 Pro", precoVenda: 3999, precoCusto: 3200, categoriaId: catSmartphone?.id || categorias[0]?.id },
    { nome: "Xiaomi Redmi Note 13", marca: "Xiaomi", modelo: "Redmi Note 13", precoVenda: 1599, precoCusto: 1200, categoriaId: catSmartphone?.id || categorias[0]?.id },
    { nome: "Capa Silicone iPhone 15", marca: "Genérica", modelo: "Capa", precoVenda: 49, precoCusto: 15, categoriaId: catAcessorio?.id || categorias[0]?.id },
    { nome: "Película Vidro Premium", marca: "Premium Glass", modelo: "Película", precoVenda: 29, precoCusto: 8, categoriaId: catAcessorio?.id || categorias[0]?.id },
    { nome: "Carregador Turbo 30W", marca: "Xiaomi", modelo: "Carregador", precoVenda: 89, precoCusto: 35, categoriaId: catAcessorio?.id || categorias[0]?.id },
    { nome: "Fone Bluetooth TWS", marca: "Xiaomi", modelo: "Redmi Buds 4", precoVenda: 149, precoCusto: 80, categoriaId: catAcessorio?.id || categorias[0]?.id },
    { nome: "Power Bank 20000mAh", marca: "Xiaomi", modelo: "Power Bank 3", precoVenda: 129, precoCusto: 65, categoriaId: catAcessorio?.id || categorias[0]?.id },
  ];

  const produtos = [];
  for (const p of produtosData) {
    const existente = await prisma.productParent.findFirst({
      where: { tenantId: tid, nome: p.nome },
    });
    if (existente) {
      produtos.push(existente);
      console.log(`  ↻ Produto já existe: ${p.nome}`);
      continue;
    }
    const criado = await prisma.productParent.create({
      data: {
        tenantId: tid,
        nome: p.nome,
        marca: p.marca,
        modelo: p.modelo,
        tipo: "NOVO",
        precoVenda: p.precoVenda,
        precoCusto: p.precoCusto,
        sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        categoriaId: p.categoriaId || categorias[0]?.id,
        garantiaPadrao: 12,
        ativo: true,
      },
    });
    produtos.push(criado);
    console.log(`  ✅ Produto criado: ${p.nome}`);
  }

  // Criar estoque para cada produto
  for (const p of produtos) {
    const existente = await prisma.stockItem.findFirst({
      where: { tenantId: tid, parentId: p.id, status: "EM_ESTOQUE" },
    });
    if (existente) continue;

    const qtd = Math.floor(Math.random() * 8) + 2; // 2-10 unidades
    for (let i = 0; i < qtd; i++) {
      await prisma.stockItem.create({
        data: {
          tenantId: tid,
          parentId: p.id,
          status: "EM_ESTOQUE",
          condicao: "NOVO",
          precoVenda: p.precoVenda,
          precoCusto: p.precoCusto,
          cor: ["Preto", "Branco", "Azul", "Verde"][Math.floor(Math.random() * 4)],
          imei: String(Math.floor(100000000000000 + Math.random() * 900000000000000)),
          dataEntrada: new Date(),
        },
      });
    }
    console.log(`  📦 Estoque criado: ${qtd}x ${p.nome}`);
  }

  // Criar clientes de teste
  const clientesData = [
    { nome: "Carlos Santos", telefone: "(11) 99999-0001", cpf: "123.456.789-01" },
    { nome: "Maria Oliveira", telefone: "(11) 99999-0002", cpf: "123.456.789-02" },
    { nome: "João Pereira", telefone: "(11) 99999-0003", cpf: "123.456.789-03" },
    { nome: "Ana Costa", telefone: "(11) 99999-0004", cpf: "123.456.789-04" },
    { nome: "Pedro Souza", telefone: "(11) 99999-0005", cpf: "123.456.789-05" },
    { nome: "Lucia Ferreira", telefone: "(11) 99999-0006", cpf: "123.456.789-06" },
    { nome: "Roberto Lima", telefone: "(11) 99999-0007", cpf: "123.456.789-07" },
  ];

  const clientes = [];
  for (const c of clientesData) {
    const existente = await prisma.client.findFirst({
      where: { tenantId: tid, cpf: c.cpf },
    });
    if (existente) {
      clientes.push(existente);
      continue;
    }
    const criado = await prisma.client.create({
      data: {
        tenantId: tid,
        nome: c.nome,
        telefone: c.telefone,
        cpf: c.cpf,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      },
    });
    clientes.push(criado);
    console.log(`  👤 Cliente criado: ${c.nome}`);
  }

  // Criar fornecedores
  const fornecedoresData = [
    { nome: "Distribuidora Tech Brasil", contato: "Carlos Distribuidor", telefone: "(11) 3000-0001" },
    { nome: "Importadora Smart Ltda", contato: "Maria Importação", telefone: "(11) 3000-0002" },
    { nome: "Acessórios Plus", contato: "João Acessórios", telefone: "(11) 3000-0003" },
  ];

  for (const f of fornecedoresData) {
    const existente = await prisma.supplier.findFirst({
      where: { tenantId: tid, nome: f.nome },
    });
    if (existente) continue;
    await prisma.supplier.create({
      data: {
        tenantId: tid,
        nome: f.nome,
        contato: f.contato,
        telefone: f.telefone,
        prazoMedio: 30,
      },
    });
    console.log(`  🏭 Fornecedor criado: ${f.nome}`);
  }

  // Criar contas a pagar
  const contasPagar = [
    { descricao: "Aluguel da Loja", valor: 3500, categoria: "ALUGUEL" },
    { descricao: "Energia Elétrica", valor: 450, categoria: "UTILIDADES" },
    { descricao: "Internet + Telefone", valor: 299, categoria: "UTILIDADES" },
    { descricao: "Salário Funcionários", valor: 8500, categoria: "FOLHA" },
    { descricao: "Compra Fornecedor - iPhones", valor: 45000, categoria: "ESTOQUE" },
  ];

  for (const c of contasPagar) {
    const existente = await prisma.accountPayable.findFirst({
      where: { tenantId: tid, descricao: c.descricao },
    });
    if (existente) continue;
    await prisma.accountPayable.create({
      data: {
        tenantId: tid,
        descricao: c.descricao,
        valor: c.valor,
        dataVencimento: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        categoria: c.categoria,
        status: Math.random() > 0.5 ? "PENDENTE" : "PAGO",
      },
    });
    console.log(`  💳 Conta a pagar: ${c.descricao} - R$${c.valor}`);
  }

  // Criar vendas (transactions) com dados históricos
  const formasPagamento = ["💵 Dinheiro", "📱 PIX", "💳 Crédito", "💳 Débito"];
  
  const vendasExistentes = await prisma.transaction.count({
    where: { tenantId: tid },
  });

  if (vendasExistentes === 0) {
    const suppliers = await prisma.supplier.findMany({ where: { tenantId: tid } });
    const stockItems = await prisma.stockItem.findMany({
      where: { tenantId: tid, status: "EM_ESTOQUE" },
      include: { parent: true },
    });

    for (let i = 0; i < 15; i++) {
      const diasAtras = Math.floor(Math.random() * 60) + 1; // 1-60 dias atrás
      const dataVenda = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
      
      // Pegar 1-3 itens aleatórios do estoque
      const qtdItens = Math.floor(Math.random() * 3) + 1;
      const itensVenda = stockItems.sort(() => Math.random() - 0.5).slice(0, qtdItens);
      
      const subtotal = itensVenda.reduce((s, item) => s + (item.precoVenda || 0), 0);
      const custoTotal = itensVenda.reduce((s, item) => s + (item.precoCusto || 0), 0);
      const desconto = Math.random() > 0.7 ? subtotal * 0.05 : 0; // 5% desconto 30% das vezes
      const total = subtotal - desconto;
      const lucro = total - custoTotal;

      const clienteAleatorio = clientes[Math.floor(Math.random() * clientes.length)];
      const metodo = formasPagamento[Math.floor(Math.random() * formasPagamento.length)];

      // Buscar último número
      const ultimoNumero = await prisma.transaction.findFirst({
        where: { tenantId: tid, tipo: "VENDA" },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });

      const venda = await prisma.transaction.create({
        data: {
          tenantId: tid,
          tipo: "VENDA",
          numero: (ultimoNumero?.numero || 0) + 1,
          clienteId: clienteAleatorio.id,
          status: "CONCLUIDA",
          subtotal,
          desconto,
          total,
          custoTotal,
          lucro,
          lucroPercentual: total > 0 ? (lucro / total) * 100 : 0,
          data: dataVenda,
          createdAt: dataVenda,
          payments: {
            create: {
              metodo,
              valor: total,
              parcelas: 1,
            },
          },
        },
      });

      // Criar itens da venda
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

        // Marcar item como vendido
        await prisma.stockItem.update({
          where: { id: item.id },
          data: { status: "VENDIDO", dataVenda: dataVenda },
        });
      }

      // Atualizar totalCompras do cliente
      const totalCliente = await prisma.transaction.aggregate({
        where: { tenantId: tid, clienteId: clienteAleatorio.id, status: "CONCLUIDA" },
        _sum: { total: true },
      });
      await prisma.client.update({
        where: { id: clienteAleatorio.id },
        data: {
          totalCompras: totalCliente._sum.total || 0,
          ultimaCompra: dataVenda,
        },
      });

      console.log(`  🛒 Venda #${venda.numero} criada: R$${total.toFixed(2)} - ${clienteAleatorio.nome}`);
    }
  }

  console.log("\n✅ Dados de teste gerados com sucesso!");
  console.log(`📊 Resumo:`);
  console.log(`   Produtos: ${await prisma.productParent.count({ where: { tenantId: tid } })}`);
  console.log(`   Itens em estoque: ${await prisma.stockItem.count({ where: { tenantId: tid, status: "EM_ESTOQUE" } })}`);
  console.log(`   Clientes: ${await prisma.client.count({ where: { tenantId: tid } })}`);
  console.log(`   Fornecedores: ${await prisma.supplier.count({ where: { tenantId: tid } })}`);
  console.log(`   Vendas realizadas: ${await prisma.transaction.count({ where: { tenantId: tid, tipo: "VENDA" } })}`);
  console.log(`   Contas a pagar: ${await prisma.accountPayable.count({ where: { tenantId: tid } })}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
