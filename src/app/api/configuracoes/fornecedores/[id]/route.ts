import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  // Verifica se o catálogo pertence ao tenant
  const catalog: any = await prisma.$queryRawUnsafe(
    `SELECT id FROM "SupplierCatalog" WHERE "id" = $1 AND "tenantId" = $2`,
    id, tenantId
  );
  if (!catalog || (catalog as any[]).length === 0) {
    return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
  }

  // Deleta (Cascade deleta os itens também)
  await prisma.$executeRawUnsafe(`DELETE FROM "SupplierCatalog" WHERE "id" = $1`, id);

  return NextResponse.json({ success: true });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const items = await prisma.$queryRawUnsafe(
    `SELECT * FROM "SupplierCatalogItem" WHERE "catalogId" = $1 AND "tenantId" = $2 ORDER BY "descricao" ASC`,
    id, tenantId
  );

  return NextResponse.json(items);
}
