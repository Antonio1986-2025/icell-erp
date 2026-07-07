import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const cliente = await prisma.client.findFirst({
    where: { id, tenantId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          items: {
            include: {
              parent: { select: { nome: true } },
              stockItem: { select: { imei: true } },
            },
          },
          vendedor: { select: { nome: true } },
        },
      },
      inspectionReports: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.client.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const cliente = await prisma.client.update({
    where: { id },
    data: {
      nome: body.nome ?? existing.nome,
      cpf: body.cpf !== undefined ? body.cpf || null : existing.cpf,
      rg: body.rg !== undefined ? body.rg || null : existing.rg,
      telefone: body.telefone !== undefined ? body.telefone || null : existing.telefone,
      email: body.email !== undefined ? body.email || null : existing.email,
      endereco: body.endereco !== undefined ? body.endereco || null : existing.endereco,
      dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : existing.dataNascimento,
      observacoes: body.observacoes !== undefined ? body.observacoes || null : existing.observacoes,
    },
  });

  return NextResponse.json(cliente);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const existing = await prisma.client.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const transactionCount = await prisma.transaction.count({
    where: { clienteId: id },
  });

  if (transactionCount > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir cliente com transações vinculadas" },
      { status: 400 }
    );
  }

  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
