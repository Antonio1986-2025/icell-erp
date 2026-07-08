import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;

  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { sku: { contains: search } },
      { marca: { contains: search } },
      { modelo: { contains: search } },
    ];
  }

  const [produtos, total] = await Promise.all([
    prisma.productParent.findMany({
      where,
      include: {
        categoria: true,
        _count: { select: { stockItems: true } },
        stockItems: {
          where: { status: "EM_ESTOQUE" },
          select: { id: true, imei: true, cor: true, capacidade: true, condicao: true },
          take: 5,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.productParent.count({ where }),
  ]);

  return NextResponse.json({ produtos, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  const categoria = await prisma.category.findFirst({
    where: { id: body.categoriaId, tenantId },
  });
  if (!categoria) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 400 });
  }

  if (categoria.hasImei && body.tipo === "USADO" && !body.stockItem?.imei) {
    return NextResponse.json({ error: "IMEI é obrigatório para celulares usados" }, { status: 400 });
  }

  if (categoria.hasImei && body.tipo === "NOVO" && (!body.imeis || body.imeis.filter((i: string) => i?.trim()).length === 0)) {
    return NextResponse.json({ error: "IMEI é obrigatório para celulares novos" }, { status: 400 });
  }

  const imeisParaValidar: string[] = body.tipo === "USADO"
    ? [body.stockItem?.imei].filter(Boolean)
    : (body.imeis || []).filter((i: string) => i?.trim()).map((i: string) => i.trim());

  if (imeisParaValidar.length > 0) {
    const existentes = await prisma.stockItem.findMany({
      where: { tenantId, imei: { in: imeisParaValidar } },
      select: { imei: true },
    });

    if (existentes.length > 0) {
      const duplicados = existentes.map((e) => e.imei).join(", ");
      return NextResponse.json(
        { error: `IMEI(s) já cadastrado(s): ${duplicados}` },
        { status: 400 }
      );
    }
  }

  const produto = await prisma.productParent.create({
    data: {
      tenantId,
      categoriaId: body.categoriaId,
      nome: body.nome,
      marca: body.marca || null,
      modelo: body.modelo || null,
      tipo: body.tipo || "NOVO",
      descricao: body.descricao || null,
      precoVenda: body.precoVenda ? parseFloat(body.precoVenda) : null,
      precoCusto: body.precoCusto ? parseFloat(body.precoCusto) : null,
      sku: body.sku || null,
      garantiaPadrao: body.garantiaPadrao ? parseInt(body.garantiaPadrao) : null,
      ...(body.tipo === "USADO" && body.stockItem
        ? {
            stockItems: {
              create: {
                tenantId,
                imei: body.stockItem.imei || undefined,
                serialNumber: body.stockItem.serialNumber || undefined,
                cor: body.stockItem.cor || undefined,
                capacidade: body.stockItem.capacidade || undefined,
                nivelBateria: body.stockItem.nivelBateria ? parseInt(body.stockItem.nivelBateria) : undefined,
                condicao: body.stockItem.condicao || undefined,
                acessoriosInclusos: body.stockItem.acessoriosInclusos || undefined,
                observacoes: body.stockItem.observacoes || undefined,
                fornecedorId: body.stockItem.fornecedorId || undefined,
                status: "EM_ESTOQUE",
              },
            },
          }
        : {}),
    },
    include: { categoria: true, stockItems: { take: 3 } },
  });

  if (body.tipo === "NOVO" && body.imeis?.length > 0) {
    await prisma.stockItem.createMany({
      data: body.imeis
        .filter((i: string) => i?.trim())
        .map((imei: string) => ({
          tenantId,
          parentId: produto.id,
          imei: imei.trim(),
          status: "EM_ESTOQUE",
        })),
    });
  }

  return NextResponse.json({ produto });
}
