import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "";
  const status = searchParams.get("status") || "";

  const where: any = { tenantId };
  if (tipo) where.tipo = tipo;
  if (status) {
    const statusList = status.split(",").map((s) => s.trim()).filter(Boolean);
    where.status = statusList.length === 1 ? statusList[0] : { in: statusList };
  }

  const vendas = await prisma.transaction.findMany({
    where,
    include: {
      cliente: { select: { nome: true, cpf: true, telefone: true } },
      fornecedor: { select: { nome: true } },
      vendedor: { select: { nome: true } },
      items: {
        include: {
          stockItem: { select: { imei: true, cor: true, capacidade: true } },
          parent: { select: { nome: true, marca: true, modelo: true } },
        },
      },
      inspectionReports: { select: { id: true, aparelhoNome: true, valorEstimado: true, imei: true } },
      payments: { select: { id: true, metodo: true, valor: true, parcelas: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(vendas);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const vendedorId = (session.user as any).id;
  const body = await request.json();

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
  }

  const isPreVenda = body.status === "PRE_VENDA";
  const tipoFinal = isPreVenda ? "VENDA" : body.laudoId ? "TRADE_IN" : "VENDA";
  const numero = await generateNumero(tipoFinal, tenantId);

  let subtotal = 0;
  let custoTotal = 0;

  for (const item of body.items) {
    if (item.tipo === "SAIDA") subtotal += item.precoUnit * item.quantidade;
    if (item.stockItemId) {
      const stock = await prisma.stockItem.findUnique({
        where: { id: item.stockItemId },
        select: { precoCusto: true },
      });
      if (stock?.precoCusto) custoTotal += stock.precoCusto * item.quantidade;
    }
  }

  const desconto = parseFloat(body.desconto || "0");
  const total = subtotal - desconto;

  let laudoValor = 0;
  let laudoData: any = null;
  if (body.laudoId) {
    laudoData = await prisma.inspectionReport.findFirst({
      where: { id: body.laudoId, tenantId, status: "PENDENTE" },
    });
    if (!laudoData) {
      return NextResponse.json({ error: "Laudo não encontrado ou já finalizado" }, { status: 400 });
    }
    laudoValor = laudoData.valorEstimado || 0;
  }

  const totalFinal = total - laudoValor;

  let troco = 0;
  const payments = (body.payments || []) as { metodo: string; valor: number; parcelas?: number }[];
  const totalPago = payments.reduce((s, p) => s + p.valor, 0);
  if (totalPago > totalFinal) troco = totalPago - totalFinal;

  const transaction = await prisma.$transaction(async (tx) => {
    const transacao = await tx.transaction.create({
      data: {
        tenantId,
        tipo: tipoFinal,
        numero,
        clienteId: body.clienteId || null,
        fornecedorId: body.fornecedorId || null,
        vendedorId,
        criadorId: vendedorId,
        status: isPreVenda ? "PRE_VENDA" : "CONCLUIDA",
        subtotal,
        desconto,
        total: isPreVenda ? subtotal : totalFinal,
        custoTotal,
        lucro: isPreVenda ? 0 : totalFinal - custoTotal,
        observacoes: isPreVenda && (body.cor || body.capacidade || body.condicao)
          ? [body.observacoes, `COR:${body.cor || ""}`, `CAP:${body.capacidade || ""}`, `COND:${body.condicao || "NOVO"}`].filter(Boolean).join(" | ")
          : (body.observacoes || null),
      },
    });

    for (const item of body.items) {
      await tx.transactionItem.create({
        data: {
          tenantId,
          transacaoId: transacao.id,
          stockItemId: item.stockItemId || null,
          parentId: item.parentId || null,
          tipo: item.tipo,
          quantidade: item.quantidade || 1,
          precoUnit: item.precoUnit,
          subtotal: item.precoUnit * (item.quantidade || 1),
        },
      });

      if (!isPreVenda && item.stockItemId && item.tipo === "SAIDA") {
        await tx.stockItem.update({
          where: { id: item.stockItemId },
          data: {
            status: "VENDIDO",
            dataVenda: new Date(),
          },
        });
      }
    }

    if (!isPreVenda) {
      for (const pag of payments) {
        await tx.transactionPayment.create({
          data: {
            transactionId: transacao.id,
            metodo: pag.metodo,
            valor: pag.valor,
            parcelas: pag.parcelas || 1,
          },
        });
      }
    }

    // Only create trade-in StockItems and update laudo if NOT a pre-venda
    if (!isPreVenda && body.laudoId && laudoData) {
      let parent = await tx.productParent.findFirst({
        where: { tenantId, nome: laudoData.aparelhoNome },
      });

      if (!parent) {
        parent = await tx.productParent.create({
          data: {
            tenantId,
            categoriaId: body.categoriaId || (await tx.category.findFirst({ where: { tenantId, ativo: true } }))?.id || "",
            nome: laudoData.aparelhoNome,
            marca: laudoData.marca || null,
            modelo: laudoData.modelo || null,
            tipo: "USADO",
            precoCusto: laudoData.valorEstimado || 0,
          },
        });
      }

      const stockItem = await tx.stockItem.create({
        data: {
          tenantId,
          parentId: parent.id,
          imei: laudoData.imei || null,
          serialNumber: laudoData.serialNumber || null,
          condicao: laudoData.condicao || null,
          nivelBateria: laudoData.nivelBateria || null,
          status: "EM_ESTOQUE",
          cor: laudoData.cor || null,
          capacidade: laudoData.capacidade || null,
          precoCusto: laudoData.valorEstimado || 0,
          dataEntrada: new Date(),
          observacoes: `Entrada via laudo ${laudoData.id} - ${laudoData.observacoes || ""}`,
        },
      });

      // Add trade-in item to transaction (negative value)
      await tx.transactionItem.create({
        data: {
          tenantId,
          transacaoId: transacao.id,
          stockItemId: stockItem.id,
          tipo: "ENTRADA",
          quantidade: 1,
          precoUnit: -(laudoData.valorEstimado || 0),
          subtotal: -(laudoData.valorEstimado || 0),
        },
      });

      await tx.inspectionReport.update({
        where: { id: body.laudoId },
        data: {
          status: "CONCLUIDO",
          stockItemId: stockItem.id,
          transactionId: transacao.id,
        },
      });

      // Update client total purchases
      if (body.clienteId) {
        await tx.client.update({
          where: { id: body.clienteId },
          data: {
            totalCompras: { increment: total },
            ultimaCompra: new Date(),
          },
        });
      }
    }

    return transacao;
  });

  const result = await prisma.transaction.findUnique({
    where: { id: transaction.id },
    include: {
      cliente: { select: { nome: true, cpf: true } },
      fornecedor: { select: { nome: true } },
      vendedor: { select: { nome: true } },
      items: {
        include: {
          stockItem: { select: { imei: true, cor: true, capacidade: true } },
          parent: { select: { nome: true } },
        },
      },
      inspectionReports: { select: { id: true, aparelhoNome: true, valorEstimado: true } },
      payments: { select: { id: true, metodo: true, valor: true, parcelas: true } },
    },
  });

  return NextResponse.json({ ...result, troco }, { status: 201 });
}
