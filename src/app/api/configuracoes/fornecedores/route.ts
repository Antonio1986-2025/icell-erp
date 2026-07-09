import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractFromPdf, extractFromXlsx, type ExtractedProduct } from "@/lib/extract-tabela";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const catalogs = await prisma.$queryRawUnsafe(
    `SELECT * FROM "SupplierCatalog" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC`,
    tenantId
  );

  return NextResponse.json(catalogs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const nomeFornecedor = (formData.get("fornecedor") as string) || "Fornecedor";
    const nomeTabela = (formData.get("nome") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const tipoArquivo = ext === ".xlsx" || ext === ".xls" ? "xlsx" : ext === ".pdf" ? "pdf" : "image";
    const uploadDir = path.join(process.cwd(), "public", "uploads", "fornecedores");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Cria o catálogo
    const catalogId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SupplierCatalog" ("id", "tenantId", "nome", "fornecedor", "arquivoOriginal", "tipoArquivo", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSANDO', NOW(), NOW())`,
      catalogId, tenantId, nomeTabela, nomeFornecedor, file.name, tipoArquivo
    );

    // Extrai os produtos
    let products: ExtractedProduct[] = [];
    try {
      if (tipoArquivo === "xlsx") {
        products = await extractFromXlsx(buffer);
      } else if (tipoArquivo === "pdf") {
        products = await extractFromPdf(buffer);
      }

      if (products.length > 0) {
        for (const p of products) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "SupplierCatalogItem" ("id", "tenantId", "catalogId", "descricao", "marca", "modelo", "capacidade", "precoUsd", "condicao", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            randomUUID(), tenantId, catalogId, p.descricao, p.marca || "APPLE", p.modelo || null, p.capacidade || null, p.precoUsd, p.condicao || "novo"
          );
        }
        await prisma.$executeRawUnsafe(
          `UPDATE "SupplierCatalog" SET "status" = 'CONCLUIDO', "totalItens" = $1 WHERE "id" = $2`,
          products.length, catalogId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "SupplierCatalog" SET "status" = 'ERRO', "extracaoErro" = 'Nenhum produto encontrado no arquivo' WHERE "id" = $1`,
          catalogId
        );
      }
    } catch (err: any) {
      await prisma.$executeRawUnsafe(
        `UPDATE "SupplierCatalog" SET "status" = 'ERRO', "extracaoErro" = $1 WHERE "id" = $2`,
        err.message || "Erro ao extrair dados", catalogId
      );
    }

    return NextResponse.json({ id: catalogId, total: products.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao processar upload" }, { status: 500 });
  }
}
