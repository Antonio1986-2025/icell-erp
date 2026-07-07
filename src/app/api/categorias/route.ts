import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const categorias = await prisma.category.findMany({
    where: { tenantId, ativo: true },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json({ categorias });
}
