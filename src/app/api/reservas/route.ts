import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const clienteSearch = searchParams.get("cliente") || "";

  const where: any = { tenantId, status: "RECEBIDA" };

  if (clienteSearch) {
    where.cliente = {
      OR: [
        { nome: { contains: clienteSearch } },
        { cpf: { contains: clienteSearch } },
      ],
    };
  }

  const reservas = await prisma.transaction.findMany({
    where,
    include: {
      cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
      fornecedor: { select: { nome: true } },
      vendedor: { select: { nome: true } },
      items: {
        include: {
          stockItem: { select: { id: true, imei: true, cor: true, capacidade: true, condicao: true, precoVenda: true } },
          parent: { select: { id: true, nome: true, marca: true, modelo: true, precoVenda: true } },
        },
      },
      inspectionReports: { select: { id: true, aparelhoNome: true, valorEstimado: true, imei: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(reservas);
}
