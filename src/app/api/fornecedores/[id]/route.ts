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

  const fornecedor = await prisma.supplier.findFirst({
    where: { id, tenantId },
    include: {
      stockItems: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          parent: { select: { nome: true, marca: true, modelo: true } },
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: {
            include: {
              parent: { select: { nome: true } },
            },
          },
          vendedor: { select: { nome: true } },
        },
      },
    },
  });

  if (!fornecedor) {
    return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });
  }

  return NextResponse.json(fornecedor);
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

  const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });
  }

  const fornecedor = await prisma.supplier.update({
    where: { id },
    data: {
      nome: body.nome ?? existing.nome,
      contato: body.contato !== undefined ? body.contato || null : existing.contato,
      cnpj: body.cnpj !== undefined ? body.cnpj || null : existing.cnpj,
      telefone: body.telefone !== undefined ? body.telefone || null : existing.telefone,
      email: body.email !== undefined ? body.email || null : existing.email,
      prazoMedio: body.prazoMedio !== undefined
        ? body.prazoMedio ? parseInt(body.prazoMedio) : null
        : existing.prazoMedio,
      observacoes: body.observacoes !== undefined ? body.observacoes || null : existing.observacoes,
    },
  });

  return NextResponse.json(fornecedor);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });
  }

  const stockCount = await prisma.stockItem.count({
    where: { fornecedorId: id },
  });

  if (stockCount > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir fornecedor com itens de estoque vinculados" },
      { status: 400 }
    );
  }

  await prisma.supplier.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
