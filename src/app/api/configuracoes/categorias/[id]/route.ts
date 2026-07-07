import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

  const categoria = await prisma.category.update({
    where: { id },
    data: {
      nome: body.nome ?? existing.nome,
      hasImei: body.hasImei ?? existing.hasImei,
      hasBattery: body.hasBattery ?? existing.hasBattery,
      hasSerial: body.hasSerial ?? existing.hasSerial,
      hasWarranty: body.hasWarranty ?? existing.hasWarranty,
      ativo: body.ativo ?? existing.ativo,
    },
  });

  return NextResponse.json(categoria);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const existing = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

  const produtosCount = await prisma.productParent.count({ where: { categoriaId: id } });
  if (produtosCount > 0) {
    return NextResponse.json({ error: `Não é possível excluir: ${produtosCount} produto(s) vinculado(s)` }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
