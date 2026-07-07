import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: any = { tenantId };
  if (status) where.status = status;

  const contas = await prisma.accountPayable.findMany({
    where,
    orderBy: { dataVencimento: "asc" },
  });

  return NextResponse.json(contas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  if (!body.descricao || !body.valor || !body.dataVencimento) {
    return NextResponse.json({ error: "Descrição, valor e data de vencimento são obrigatórios" }, { status: 400 });
  }

  const conta = await prisma.accountPayable.create({
    data: {
      tenantId,
      descricao: body.descricao,
      valor: parseFloat(body.valor),
      dataVencimento: new Date(body.dataVencimento),
      categoria: body.categoria || null,
      fornecedorId: body.fornecedorId || null,
      observacoes: body.observacoes || null,
    },
  });

  return NextResponse.json(conta, { status: 201 });
}
