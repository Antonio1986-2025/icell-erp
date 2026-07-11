import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const stockItem = await prisma.stockItem.findFirst({
    where: { id, tenantId },
    include: {
      parent: { include: { categoria: true } },
      fornecedor: { select: { nome: true } },
      inspectionReports: {
        include: {
          cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
        },
      },
      transactionItems: {
        include: {
          transacao: { select: { id: true, numero: true, tipo: true, createdAt: true, total: true } },
        },
      },
    },
  });

  if (!stockItem) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  return NextResponse.json(stockItem);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  // Validar se o item existe
  const existing = await prisma.stockItem.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  // Campos que podem ser editados
  const allowedFields: Record<string, any> = {};
  if (body.precoVenda !== undefined) allowedFields.precoVenda = parseFloat(body.precoVenda);
  if (body.dataFimGarantia !== undefined) allowedFields.dataFimGarantia = body.dataFimGarantia ? new Date(body.dataFimGarantia) : null;
  if (body.observacoes !== undefined) allowedFields.observacoes = body.observacoes;
  if (body.condicao !== undefined) allowedFields.condicao = body.condicao;
  if (body.acessoriosInclusos !== undefined) allowedFields.acessoriosInclusos = body.acessoriosInclusos;

  const updated = await prisma.stockItem.update({
    where: { id },
    data: allowedFields,
  });

  return NextResponse.json(updated);
}
