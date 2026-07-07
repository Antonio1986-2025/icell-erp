import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  const preVenda = await prisma.transaction.findFirst({
    where: { id, tenantId, status: { in: ["PRE_VENDA", "AGUARDANDO_COMPRA"] } },
  });

  if (!preVenda) {
    return NextResponse.json({ error: "Pré-venda não encontrada ou já processada" }, { status: 404 });
  }

  const data: any = {};

  if (body.fornecedorId) data.fornecedorId = body.fornecedorId;
  if (body.custoTotal !== undefined) data.custoTotal = body.custoTotal;
  if (body.prazoEntregaDias !== undefined) data.prazoEntregaDias = body.prazoEntregaDias;
  if (body.status) data.status = body.status;
  if (body.observacoes) {
    data.observacoes = [preVenda.observacoes, body.observacoes].filter(Boolean).join(" | ") || null;
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data,
    include: {
      cliente: { select: { nome: true } },
      fornecedor: { select: { nome: true } },
      vendedor: { select: { nome: true } },
      items: { include: { parent: { select: { nome: true } } } },
    },
  });

  return NextResponse.json(updated);
}
