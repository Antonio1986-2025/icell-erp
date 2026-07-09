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
      { nome: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { marca: { contains: search, mode: "insensitive" } },
      { modelo: { contains: search, mode: "insensitive" } },
      { descricao: { contains: search, mode: "insensitive" } },
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
    },
    include: { categoria: true },
  });

  return NextResponse.json({ produto });
}
