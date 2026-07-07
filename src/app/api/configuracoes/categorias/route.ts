import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const categorias = await prisma.category.findMany({ where: { tenantId }, orderBy: { nome: "asc" } });
  return NextResponse.json(categorias);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  if (!body.nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const slug = body.slug || body.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const existing = await prisma.category.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
  if (existing) return NextResponse.json({ error: "Já existe uma categoria com esse slug" }, { status: 400 });

  const categoria = await prisma.category.create({
    data: {
      tenantId,
      nome: body.nome,
      slug,
      hasImei: body.hasImei || false,
      hasBattery: body.hasBattery || false,
      hasSerial: body.hasSerial || false,
      hasWarranty: body.hasWarranty ?? true,
    },
  });

  return NextResponse.json(categoria, { status: 201 });
}
