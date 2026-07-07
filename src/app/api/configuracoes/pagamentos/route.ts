import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const metodos = await prisma.paymentMethod.findMany({ where: { tenantId, ativo: true }, orderBy: { nome: "asc" } });
  return NextResponse.json(metodos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  if (!body.nome || !body.tipo) {
    return NextResponse.json({ error: "Nome e tipo são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.paymentMethod.findUnique({ where: { tenantId_nome: { tenantId, nome: body.nome } } });
  if (existing) return NextResponse.json({ error: "Método já cadastrado" }, { status: 400 });

  const metodo = await prisma.paymentMethod.create({
    data: { tenantId, nome: body.nome, tipo: body.tipo },
  });

  return NextResponse.json(metodo, { status: 201 });
}
