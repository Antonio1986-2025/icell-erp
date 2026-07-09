import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const tipo = searchParams.get("tipo") || "";

  // Buscar COMPRAS (tipo COMPRA + VENDA com status de compra)
  const where: any = { tenantId };

  if (tipo === "COMPRA") {
    where.tipo = "COMPRA";
  } else if (tipo === "VENDA") {
    where.tipo = "VENDA";
    where.status = { in: ["PRE_VENDA", "AGUARDANDO_COMPRA", "COMPRA_REALIZADA", "RECEBIDA"] };
  } else {
    // Todas: COMPRA + vendas com status de compra
    where.OR = [
      { tipo: "COMPRA" },
      { tipo: "VENDA", status: { in: ["PRE_VENDA", "AGUARDANDO_COMPRA", "COMPRA_REALIZADA", "RECEBIDA"] } },
    ];
  }

  if (status) {
    delete where.OR;
    delete where.tipo;
    where.status = status;
    where.tipo = { in: ["COMPRA", "VENDA"] };
  }

  const compras = await prisma.transaction.findMany({
    where,
    include: {
      cliente: { select: { nome: true, cpf: true, telefone: true } },
      fornecedor: { select: { id: true, nome: true } },
      vendedor: { select: { nome: true } },
      criador: { select: { nome: true } },
      items: {
        include: {
          parent: { select: { nome: true, marca: true, modelo: true } },
          stockItem: { select: { id: true, imei: true, serialNumber: true, nivelBateria: true, precoVenda: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(compras);
}
