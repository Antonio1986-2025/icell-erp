import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const existing = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const body = await req.json();
  const data: any = {
    nome: body.nome ?? existing.nome,
    email: body.email ?? existing.email,
    role: body.role ?? existing.role,
    ativo: body.ativo ?? existing.ativo,
    comissao: body.comissao !== undefined ? (body.comissao ? parseFloat(body.comissao) : null) : existing.comissao,
  };

  if (body.senha) {
    data.senha = await hash(body.senha, 10);
  }

  const usuario = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, nome: true, email: true, role: true, ativo: true, comissao: true },
  });

  return NextResponse.json(usuario);
}
