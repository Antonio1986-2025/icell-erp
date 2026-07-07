import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getConta(tenantId: string, id: string) {
  return prisma.accountPayable.findFirst({ where: { id, tenantId } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const existing = await getConta(tenantId, id);
  if (!existing) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  const body = await req.json();
  const conta = await prisma.accountPayable.update({
    where: { id },
    data: {
      descricao: body.descricao ?? existing.descricao,
      valor: body.valor ? parseFloat(body.valor) : existing.valor,
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : existing.dataVencimento,
      dataPagamento: body.dataPagamento !== undefined ? (body.dataPagamento ? new Date(body.dataPagamento) : null) : existing.dataPagamento,
      categoria: body.categoria !== undefined ? (body.categoria || null) : existing.categoria,
      status: body.status ?? existing.status,
      fornecedorId: body.fornecedorId !== undefined ? (body.fornecedorId || null) : existing.fornecedorId,
      observacoes: body.observacoes !== undefined ? (body.observacoes || null) : existing.observacoes,
    },
  });

  return NextResponse.json(conta);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const existing = await getConta(tenantId, id);
  if (!existing) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  await prisma.accountPayable.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
