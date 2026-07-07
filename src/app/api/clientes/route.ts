import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf");
  const search = searchParams.get("search") || "";

  if (cpf) {
    const cliente = await prisma.client.findFirst({
      where: { tenantId, cpf },
    });
    return NextResponse.json(cliente);
  }

  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { cpf: { contains: search } },
      { telefone: { contains: search } },
    ];
  }

  const clientes = await prisma.client.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 20,
  });

  return NextResponse.json(clientes);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await request.json();

  if (!body.nome) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const cliente = await prisma.client.create({
    data: {
      tenantId,
      nome: body.nome,
      cpf: body.cpf || null,
      rg: body.rg || null,
      telefone: body.telefone || null,
      email: body.email || null,
      endereco: body.endereco || null,
      dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null,
      observacoes: body.observacoes || null,
    },
  });

  return NextResponse.json(cliente, { status: 201 });
}
