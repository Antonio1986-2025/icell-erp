import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const venda = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
      fornecedor: { select: { id: true, nome: true } },
      vendedor: { select: { nome: true } },
      items: {
        include: {
          stockItem: { select: { id: true, imei: true, cor: true, capacidade: true, prazoEntregaDias: true } },
          parent: { select: { id: true, nome: true, marca: true, modelo: true, precoVenda: true } },
        },
      },
      inspectionReports: { select: { id: true, aparelhoNome: true, valorEstimado: true, imei: true } },
      payments: { select: { id: true, metodo: true, valor: true, parcelas: true } },
    },
  });

  if (!venda) {
    return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
  }

  return NextResponse.json(venda);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  const preVenda = await prisma.transaction.findFirst({
    where: { id, tenantId, status: "PRE_VENDA" },
  });

  if (!preVenda) {
    return NextResponse.json({ error: "Pré-venda não encontrada ou já finalizada" }, { status: 404 });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      fornecedorId: body.fornecedorId || null,
      prazoEntregaDias: body.prazoEntregaDias ? parseInt(body.prazoEntregaDias) : null,
      custoTotal: body.precoCusto ? parseFloat(body.precoCusto) : 0,
      status: "COMPRA_REALIZADA",
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: "COMPRA_REALIZADA",
    message: "Compra registrada com sucesso",
  });
}
