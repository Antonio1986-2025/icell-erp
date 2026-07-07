import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const usuarios = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, nome: true, email: true, role: true, ativo: true, comissao: true, createdAt: true },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  if (!body.nome || !body.email || !body.senha) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { email: body.email, tenantId } });
  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });

  const usuario = await prisma.user.create({
    data: {
      tenantId,
      nome: body.nome,
      email: body.email,
      senha: await hash(body.senha, 10),
      role: body.role || "VENDEDOR",
      comissao: body.comissao ? parseFloat(body.comissao) : null,
    },
    select: { id: true, nome: true, email: true, role: true, ativo: true, comissao: true, createdAt: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
