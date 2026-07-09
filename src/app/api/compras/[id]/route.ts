import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  const transaction = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      items: {
        include: {
          stockItem: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
  }

  const data: any = {};

  if (body.fornecedorId) data.fornecedorId = body.fornecedorId;
  if (body.custoTotal !== undefined) data.custoTotal = body.custoTotal;
  if (body.prazoEntregaDias !== undefined) data.prazoEntregaDias = body.prazoEntregaDias;
  if (body.status) data.status = body.status;
  if (body.observacoes) data.observacoes = body.observacoes;

  // Ao receber (mudar para RECEBIDA), atualizar status dos stockItems
  if (body.status === "RECEBIDA") {
    // Atualizar todos os stockItems desta transação para EM_ESTOQUE
    const stockItemIds = transaction.items
      .filter(i => i.stockItem?.id)
      .map(i => i.stockItem!.id);

    if (stockItemIds.length > 0) {
      await prisma.stockItem.updateMany({
        where: { id: { in: stockItemIds }, tenantId },
        data: { status: "EM_ESTOQUE" },
      });
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data,
    include: {
      cliente: { select: { nome: true } },
      fornecedor: { select: { nome: true } },
      vendedor: { select: { nome: true } },
      criador: { select: { nome: true } },
      items: {
        include: {
          parent: { select: { nome: true, marca: true, modelo: true } },
          stockItem: { select: { id: true, imei: true, serialNumber: true, nivelBateria: true, precoVenda: true, status: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
      fornecedor: { select: { id: true, nome: true, cnpj: true } },
      vendedor: { select: { id: true, nome: true } },
      criador: { select: { id: true, nome: true } },
      items: {
        include: {
          parent: { select: { id: true, nome: true, marca: true, modelo: true, categoria: true } },
          stockItem: {
            select: {
              id: true, imei: true, serialNumber: true, nivelBateria: true,
              precoVenda: true, precoCusto: true, status: true, condicao: true,
              cor: true, capacidade: true, dataEntrada: true,
            },
          },
        },
      },
      documents: true,
    },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  return NextResponse.json(transaction);
}
