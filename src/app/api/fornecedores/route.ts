import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { cnpj: { contains: search } },
      { contato: { contains: search } },
    ];
  }

  const fornecedores = await prisma.supplier.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 20,
  });

  return NextResponse.json({ fornecedores });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await request.json();

  if (!body.nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const fornecedor = await prisma.supplier.create({
    data: {
      tenantId,
      nome: body.nome,
      contato: body.contato || null,
      cnpj: body.cnpj || null,
      telefone: body.telefone || null,
      email: body.email || null,
      prazoMedio: body.prazoMedio ? parseInt(body.prazoMedio) : null,
      observacoes: body.observacoes || null,
    },
  });

  return NextResponse.json(fornecedor, { status: 201 });
}
