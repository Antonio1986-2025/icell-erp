import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  // Validações básicas
  if (!body.imei || !body.imei.trim()) {
    return NextResponse.json({ error: "IMEI é obrigatório" }, { status: 400 });
  }
  if (!body.nome || !body.nome.trim()) {
    return NextResponse.json({ error: "Nome do aparelho é obrigatório" }, { status: 400 });
  }

  // Verifica IMEI duplicado
  const existente = await prisma.stockItem.findFirst({
    where: { tenantId, imei: body.imei.trim() },
  });
  if (existente) {
    return NextResponse.json({ error: `IMEI ${body.imei} já está cadastrado` }, { status: 400 });
  }

  // Encontra ou auto-cria a categoria "Celulares"
  let categoria = await prisma.category.findFirst({
    where: { tenantId, slug: "celulares" },
  });
  if (!categoria) {
    categoria = await prisma.category.create({
      data: {
        tenantId,
        nome: "Celulares",
        slug: "celulares",
        hasImei: true,
        hasBattery: true,
        hasSerial: false,
        hasWarranty: true,
      },
    });
  }

  // Cria StockItem independente (sem ProductParent)
  const stockItem = await prisma.stockItem.create({
    data: {
      tenantId,
      nome: body.nome.trim(),
      marca: body.marca?.trim() || null,
      modelo: body.modelo?.trim() || null,
      categoriaId: categoria.id,
      imei: body.imei.trim(),
      serialNumber: body.serialNumber?.trim() || null,
      cor: body.cor?.trim() || null,
      capacidade: body.capacidade?.trim() || null,
      condicao: body.condicao || "NOVO",
      nivelBateria: body.nivelBateria ? parseInt(body.nivelBateria) : null,
      precoCusto: body.precoCusto ? parseFloat(body.precoCusto) : null,
      precoVenda: body.precoVenda ? parseFloat(body.precoVenda) : null,
      dataEntrada: new Date(),
      dataFimGarantia: body.dataFimGarantia ? new Date(body.dataFimGarantia) : null,
      observacoes: body.observacoes || null,
      status: "EM_ESTOQUE",
    },
  });

  return NextResponse.json({ stockItem }, { status: 201 });
}
