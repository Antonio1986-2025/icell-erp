import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  const where: any = { tenantId, tipo: "VENDA" };
  if (status === "PENDENTES") {
    where.status = { in: ["PRE_VENDA", "AGUARDANDO_COMPRA"] };
  } else if (status) {
    where.status = status;
  } else {
    where.status = { in: ["PRE_VENDA", "AGUARDANDO_COMPRA", "COMPRA_REALIZADA", "RECEBIDA"] };
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
        },
      },
      inspectionReports: { select: { id: true, aparelhoNome: true, valorEstimado: true, imei: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(compras);
}
