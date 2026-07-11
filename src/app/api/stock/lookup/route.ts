import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Lookup StockItem by IMEI
 * Retorna o item de estoque + produto pai se encontrado
 * GET /api/stock/lookup?imei=XXXXXXXXXXXXXXX
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(req.url);
  const imei = searchParams.get("imei")?.trim();

  if (!imei || imei.length < 8) {
    return NextResponse.json({ error: "IMEI inválido" }, { status: 400 });
  }

  const stockItem = await prisma.stockItem.findFirst({
    where: {
      tenantId,
      imei: { contains: imei, mode: "insensitive" },
    },
    include: {
      parent: {
        select: {
          id: true,
          nome: true,
          marca: true,
          modelo: true,
          precoVenda: true,
          garantiaPadrao: true,
          categoria: { select: { nome: true, hasImei: true } },
        },
      },
    },
  });

  if (!stockItem) {
    return NextResponse.json({ error: "IMEI não encontrado" }, { status: 404 });
  }

  return NextResponse.json(stockItem);
}
