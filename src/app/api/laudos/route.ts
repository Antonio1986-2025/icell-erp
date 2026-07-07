import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { aparelhoNome: { contains: search } },
      { imei: { contains: search } },
      { marca: { contains: search } },
      { modelo: { contains: search } },
    ];
  }

  const laudos = await prisma.inspectionReport.findMany({
    where,
    include: { cliente: { select: { nome: true, cpf: true, telefone: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(laudos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await request.json();

  const laudo = await prisma.inspectionReport.create({
    data: {
      tenantId,
      clienteId: body.clienteId || null,
      marca: body.marca || null,
      modelo: body.modelo || null,
      aparelhoNome: body.aparelhoNome,
      imei: body.imei || null,
      serialNumber: body.serialNumber || null,
      cor: body.cor || null,
      capacidade: body.capacidade || null,
      nivelBateria: body.nivelBateria ? parseInt(body.nivelBateria) : null,
      condicao: body.condicao || null,
      fotos: body.fotos || null,
      checklistResult: body.checklistResult || null,
      acessoriosInclusos: body.acessoriosInclusos || null,
      valorEstimado: body.valorEstimado ? parseFloat(body.valorEstimado) : null,
      observacoes: body.observacoes || null,
      status: "PENDENTE",
    },
  });

  if (body.imei) {
    const catImei = await prisma.category.findFirst({
      where: { tenantId, hasImei: true },
    });

    if (catImei) {
      const parent = await prisma.productParent.create({
        data: {
          tenantId,
          categoriaId: catImei.id,
          nome: body.aparelhoNome || `Produto ${body.imei}`,
          marca: body.marca || null,
          modelo: body.modelo || null,
          tipo: "USADO",
        },
      });

      const stockItem = await prisma.stockItem.create({
        data: {
          tenantId,
          parentId: parent.id,
          imei: body.imei,
          serialNumber: body.serialNumber || null,
          cor: body.cor || null,
          capacidade: body.capacidade || null,
          nivelBateria: body.nivelBateria ? parseInt(body.nivelBateria) : null,
          condicao: body.condicao || null,
          acessoriosInclusos: body.acessoriosInclusos || null,
          observacoes: body.observacoes || null,
          status: "EM_ESTOQUE",
        },
      });

      await prisma.inspectionReport.update({
        where: { id: laudo.id },
        data: { stockItemId: stockItem.id },
      });
    }
  }

  return NextResponse.json(laudo, { status: 201 });
}
