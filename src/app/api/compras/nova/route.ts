import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await request.json();

  const {
    tipo = "FORNECEDOR", // FORNECEDOR | CLIENTE
    fornecedorId,
    clienteId,
    dataCompra,
    prazoEntregaDias,
    observacoes,
    desconto = 0,
    itens = [],
  } = body;

  if (itens.length === 0) {
    return NextResponse.json({ error: "Adicione pelo menos um produto" }, { status: 400 });
  }

  // Buscar próximo número da transação
  const ultimoNumero = await prisma.transaction.findFirst({
    where: { tenantId, tipo: "COMPRA" },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = (ultimoNumero?.numero ?? 0) + 1;

  // Calcular totais
  let subtotal = 0;
  let custoTotal = 0;

  for (const item of itens) {
    const qtd = item.quantidade ?? 1;
    const precoUnit = item.precoCusto ?? 0;
    subtotal += precoUnit * qtd;
    custoTotal += precoUnit * qtd;
  }

  const total = subtotal - desconto;

  // Criar transação do tipo COMPRA (diferente de VENDA)
  const transacao = await prisma.transaction.create({
    data: {
      tenantId,
      tipo: "COMPRA",
      numero,
      status: "CONCLUIDA",
      fornecedorId: tipo === "FORNECEDOR" ? fornecedorId : null,
      clienteId: tipo === "CLIENTE" ? clienteId : null,
      criadorId: (session.user as any).id,
      data: dataCompra ? new Date(dataCompra) : new Date(),
      prazoEntregaDias: prazoEntregaDias ? parseInt(prazoEntregaDias) : null,
      subtotal,
      desconto,
      total,
      custoTotal,
      observacoes,
    },
  });

  // Criar StockItems e TransactionItems
  for (const item of itens) {
    const parentId = item.parentId;
    const quantidade = item.quantidade ?? 1;

    for (let i = 0; i < quantidade; i++) {
      // Se tem IMEI, cria StockItem individual
      if (item.imei1 || item.serial) {
        const stockItem = await prisma.stockItem.create({
          data: {
            tenantId,
            parentId,
            imei: item.imei1 || null,
            serialNumber: item.serial || null,
            condicao: item.condicao || "NOVO",
            nivelBateria: item.nivelBateria ?? null,
            status: "EM_ESTOQUE",
            cor: item.cor || null,
            capacidade: item.capacidade || null,
            precoVenda: item.precoVendaSugerido ?? null,
            precoCusto: item.precoCusto ?? 0,
            fornecedorId: tipo === "FORNECEDOR" ? fornecedorId : null,
            dataEntrada: new Date(),
            observacoes: item.observacoes || null,
            // Campos extras (não no schema atual, mas preparando):
            // garantiaMeses: item.garantiaMeses,
            // imei2: item.imei2,
          },
        });

        await prisma.transactionItem.create({
          data: {
            tenantId,
            transacaoId: transacao.id,
            stockItemId: stockItem.id,
            parentId,
            tipo: "PRODUTO",
            quantidade: 1,
            precoUnit: item.precoCusto ?? 0,
            subtotal: item.precoCusto ?? 0,
          },
        });
      } else {
        // Sem IMEI — produto em massa
        await prisma.transactionItem.create({
          data: {
            tenantId,
            transacaoId: transacao.id,
            parentId,
            tipo: "PRODUTO",
            quantidade: 1,
            precoUnit: item.precoCusto ?? 0,
            subtotal: item.precoCusto ?? 0,
          },
        });
      }
    }
  }

  // Retornar a compra criada com os itens
  const compraCompleta = await prisma.transaction.findUnique({
    where: { id: transacao.id },
    include: {
      fornecedor: { select: { id: true, nome: true } },
      cliente: { select: { id: true, nome: true } },
      items: {
        include: {
          stockItem: {
            select: { id: true, imei: true, serialNumber: true, nivelBateria: true, precoVenda: true, precoCusto: true, status: true },
          },
          parent: { select: { id: true, nome: true, marca: true, modelo: true } },
        },
      },
    },
  });

  return NextResponse.json(compraCompleta, { status: 201 });
}
