import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const stockItem = await prisma.stockItem.findFirst({
    where: { id, tenantId },
    include: {
      parent: { include: { categoria: true } },
      fornecedor: { select: { nome: true } },
      inspectionReports: {
        include: {
          cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
        },
      },
      transactionItems: {
        include: {
          transacao: { select: { id: true, numero: true, tipo: true, createdAt: true, total: true } },
        },
      },
    },
  });

  if (!stockItem) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  return NextResponse.json(stockItem);
}
