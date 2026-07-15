import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const laudo = await prisma.inspectionReport.findFirst({
    where: { id, tenantId },
    include: {
      cliente: true,
      stockItem: { include: { parent: { include: { categoria: true } } } },
      transaction: { include: { items: { include: { stockItem: true, parent: true } } } },
    },
  });

  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  return NextResponse.json(laudo);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const body = await request.json();

  const laudo = await prisma.inspectionReport.findFirst({
    where: { id, tenantId },
  });

  if (!laudo) return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });

  const updated = await prisma.inspectionReport.update({
    where: { id },
    data: {
      status: body.status ?? undefined,
      stockItemId: body.stockItemId ?? undefined,
      transactionId: body.transactionId ?? undefined,
      valorEstimado: body.valorEstimado ? parseFloat(body.valorEstimado) : undefined,
      observacoes: body.observacoes ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
