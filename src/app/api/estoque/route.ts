import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const tipo = searchParams.get("tipo") || "";

  const where: any = { tenantId };
  if (status) where.status = status;

  const isCelular = tipo === "celular";
  const isAcessorio = tipo === "acessorio";

  const stockItems = await prisma.stockItem.findMany({
    where: {
      ...where,
      parent: {
        tenantId,
        ...(isCelular ? { categoria: { hasImei: true } } : {}),
        ...(isAcessorio ? { categoria: { hasImei: false } } : {}),
        ...(search
          ? {
              OR: [
                { nome: { contains: search } },
                { marca: { contains: search } },
                { modelo: { contains: search } },
              ],
            }
          : {}),
      },
      ...(search && !isAcessorio ? { OR: [{ imei: { contains: search } }] } : {}),
    },
    include: {
      parent: { include: { categoria: true } },
      inspectionReports: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true, valorEstimado: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const accessories = await prisma.productParent.findMany({
    where: {
      tenantId,
      categoria: { hasImei: false },
      ativo: true,
      ...(search
        ? {
            OR: [
              { nome: { contains: search } },
              { marca: { contains: search } },
              { modelo: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      categoria: true,
      _count: { select: { stockItems: { where: status ? { status } : {} } } },
    },
    orderBy: { nome: "asc" },
    take: 100,
  });

  return NextResponse.json({ stockItems, accessories });
}
