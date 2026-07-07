import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  // Handle cancelamento
  if (body.status === "CANCELADO") {
    const preVenda = await prisma.transaction.findFirst({
      where: { id, tenantId, status: { in: ["PRE_VENDA", "COMPRA_REALIZADA"] } },
    });
    if (!preVenda) {
      return NextResponse.json({ error: "Pré-venda não encontrada" }, { status: 404 });
    }
    await prisma.transaction.update({
      where: { id },
      data: { status: "CANCELADO" },
    });
    return NextResponse.json({ message: "Pré-venda cancelada" });
  }

  const preVenda = await prisma.transaction.findFirst({
    where: { id, tenantId, status: { in: ["PRE_VENDA", "COMPRA_REALIZADA"] } },
    include: {
      items: { include: { parent: true } },
      inspectionReports: true,
      cliente: true,
    },
  });

  if (!preVenda) {
    return NextResponse.json({ error: "Pré-venda não encontrada ou já finalizada" }, { status: 404 });
  }

  // Validate duplicate IMEI
  const imei = body.imei?.replace(/\D/g, "");
  if (imei && imei.length >= 10) {
    const existingStock = await prisma.stockItem.findFirst({
      where: { tenantId, imei, status: { not: "VENDIDO" } },
      select: { id: true, status: true },
    });
    if (existingStock) {
      return NextResponse.json({
        error: `IMEI ${imei} já está cadastrado no estoque (status: ${existingStock.status})`,
      }, { status: 400 });
    }
  }

  // ======= FLUXO: RECEBER PRODUTO =======
  if (body.status === "RECEBIDA") {
    const saidaItem = preVenda.items.find((i) => i.tipo === "SAIDA");
    if (!saidaItem?.parentId) {
      return NextResponse.json({ error: "Item da pré-venda não encontrado" }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: "RECEBIDA",
          observacoes: [preVenda.observacoes, body.observacoes].filter(Boolean).join(" | ") || null,
        },
      });

      // Create StockItem as EM_ESTOQUE
      const stockItem = await tx.stockItem.create({
        data: {
          tenantId,
          parentId: saidaItem.parentId!,
          imei: imei || null,
          serialNumber: body.serialNumber || null,
          cor: body.cor || null,
          capacidade: body.capacidade || null,
          nivelBateria: body.nivelBateria ? parseInt(body.nivelBateria) : null,
          condicao: body.condicao || "NOVO",
          status: "EM_ESTOQUE",
          dataEntrada: new Date(),
          precoCusto: body.precoCusto ? parseFloat(body.precoCusto) : preVenda.custoTotal || null,
          precoVenda: saidaItem.precoUnit,
          fornecedorId: preVenda.fornecedorId,
          prazoEntregaDias: preVenda.prazoEntregaDias,
          observacoes: `Pré-venda #${preVenda.numero} — aguardando pagamento`,
        },
      });

      await tx.transactionItem.update({
        where: { id: saidaItem.id },
        data: { stockItemId: stockItem.id },
      });

      // Create InspectionReport if checklist was provided
      if (body.inspectionChecklist) {
        await tx.inspectionReport.create({
          data: {
            tenantId,
            clienteId: preVenda.clienteId,
            stockItemId: stockItem.id,
            transactionId: id,
            marca: saidaItem.parent?.marca || null,
            modelo: saidaItem.parent?.modelo || null,
            aparelhoNome: saidaItem.parent?.nome || "Aparelho",
            imei: imei || null,
            serialNumber: body.serialNumber || null,
            cor: body.cor || null,
            capacidade: body.capacidade || null,
            nivelBateria: body.nivelBateria ? parseInt(body.nivelBateria) : null,
            condicao: body.condicao || null,
            fotos: body.inspectionFotos || null,
            checklistResult: body.inspectionChecklist,
            valorEstimado: body.inspectionValor ? parseFloat(body.inspectionValor) : null,
            observacoes: body.inspectionObservacoes || null,
            status: "CONCLUIDO",
          },
        });
      }

      // Handle trade-in laudo
      const laudoData = preVenda.inspectionReports?.[0];
      if (laudoData) {
        let parent = await tx.productParent.findFirst({
          where: { tenantId, nome: laudoData.aparelhoNome },
        });

        if (!parent) {
          const cat = await tx.category.findFirst({ where: { tenantId, hasImei: true } });
          parent = await tx.productParent.create({
            data: {
              tenantId,
              categoriaId: cat?.id || (await tx.category.findFirst({ where: { tenantId, ativo: true } }))?.id || "",
              nome: laudoData.aparelhoNome,
              marca: laudoData.marca,
              modelo: laudoData.modelo,
              tipo: "USADO",
              precoCusto: laudoData.valorEstimado || 0,
            },
          });
        }

        const tradeStock = await tx.stockItem.create({
          data: {
            tenantId,
            parentId: parent.id,
            imei: laudoData.imei,
            serialNumber: laudoData.serialNumber,
            condicao: laudoData.condicao,
            nivelBateria: laudoData.nivelBateria,
            status: "EM_ESTOQUE",
            cor: laudoData.cor,
            capacidade: laudoData.capacidade,
            precoCusto: laudoData.valorEstimado || 0,
            dataEntrada: new Date(),
            observacoes: `Entrada via laudo ${laudoData.id} (pré-venda #${preVenda.numero})`,
          },
        });

        await tx.transactionItem.create({
          data: {
            tenantId,
            transacaoId: id,
            stockItemId: tradeStock.id,
            tipo: "ENTRADA",
            quantidade: 1,
            precoUnit: -(laudoData.valorEstimado || 0),
            subtotal: -(laudoData.valorEstimado || 0),
          },
        });

        await tx.inspectionReport.update({
          where: { id: laudoData.id },
          data: { status: "CONCLUIDO", stockItemId: tradeStock.id, transactionId: id },
        });
      }

      return updated;
    });

    return NextResponse.json({ id, status: "RECEBIDA", message: "Produto recebido no estoque" });
  }

  // ======= FLUXO: FINALIZAR VENDA (pagamento) =======
  if (body.status === "CONCLUIDA" || !body.status) {
    const laudoData = preVenda.inspectionReports?.[0];
    const laudoValor = laudoData?.valorEstimado || 0;
    const subtotal = preVenda.subtotal;
    const desconto = preVenda.desconto;
    const totalFinal = subtotal - desconto - laudoValor;

    const payments = (body.payments || []) as { metodo: string; valor: number; parcelas?: number }[];
    const totalPago = payments.reduce((s, p) => s + p.valor, 0);
    const troco = totalPago > totalFinal ? totalPago - totalFinal : 0;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: "CONCLUIDA",
          total: totalFinal,
          lucro: totalFinal - (preVenda.custoTotal || 0),
          observacoes: [preVenda.observacoes, body.observacoes].filter(Boolean).join(" | ") || null,
        },
      });

      // Find existing StockItem (already created during "Receber" step)
      const saidaItem = preVenda.items.find((i) => i.tipo === "SAIDA");

      if (saidaItem?.stockItemId) {
        // Update existing stock item to VENDIDO
        await tx.stockItem.update({
          where: { id: saidaItem.stockItemId },
          data: {
            status: "VENDIDO",
            dataVenda: new Date(),
            observacoes: `Vendido via pré-venda #${preVenda.numero}`,
          },
        });
      }

      // Create payments
      for (const pag of payments) {
        await tx.transactionPayment.create({
          data: {
            transactionId: id,
            metodo: pag.metodo,
            valor: pag.valor,
            parcelas: pag.parcelas || 1,
          },
        });
      }

      if (preVenda.clienteId) {
        await tx.client.update({
          where: { id: preVenda.clienteId },
          data: {
            totalCompras: { increment: totalFinal },
            ultimaCompra: new Date(),
          },
        });
      }

      return updated;
    });

    const fullResult = await prisma.transaction.findUnique({
      where: { id },
      include: {
        cliente: { select: { nome: true } },
        fornecedor: { select: { nome: true } },
        items: {
          include: {
            stockItem: { select: { imei: true, cor: true, capacidade: true } },
            parent: { select: { nome: true, marca: true, modelo: true } },
          },
        },
        inspectionReports: { select: { id: true, aparelhoNome: true, valorEstimado: true } },
        payments: { select: { id: true, metodo: true, valor: true, parcelas: true } },
      },
    });

    return NextResponse.json({ ...fullResult, troco }, { status: 200 });
  }

  return NextResponse.json({ error: "Status inválido" }, { status: 400 });
}
