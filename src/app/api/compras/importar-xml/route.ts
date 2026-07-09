import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
});

interface NFeItem {
  cProd?: string;
  xProd?: string;
  NCM?: string;
  CFOP?: string;
  uCom?: string;
  qCom?: number | string;
  vUnCom?: number | string;
  vProd?: number | string;
}

function parseNFeXML(xmlContent: string) {
  const parsed = parser.parse(xmlContent);
  const nfeProc = parsed.nfeProc || parsed.NFe;
  if (!nfeProc) throw new Error("XML NFe inválido");

  const infNFe = nfeProc.NFe?.infNFe || nfeProc.infNFe || nfeProc;
  if (!infNFe) throw new Error("infNFe não encontrado");

  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const detRaw = infNFe.det || [];
  const total = infNFe.total?.ICMSTot || {};

  // Normaliza det para array
  const detList: NFeItem[] = Array.isArray(detRaw) ? detRaw : detRaw ? [detRaw] : [];

  return { ide, emit, det: detList, total };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  try {
    const formData = await request.formData();
    const file = formData.get("xml") as File | null;
    const confirmar = formData.get("confirmar") === "true";
    const fornecedorId = formData.get("fornecedorId") as string | null;
    const observacoes = formData.get("observacoes") as string | null;

    if (!file) return NextResponse.json({ error: "Arquivo XML não enviado" }, { status: 400 });
    const xmlContent = await file.text();
    if (!xmlContent.trim()) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });

    // Parse
    let nfeData: ReturnType<typeof parseNFeXML>;
    try {
      nfeData = parseNFeXML(xmlContent);
    } catch (e: any) {
      return NextResponse.json({ error: `Erro no XML: ${e.message}` }, { status: 400 });
    }

    const { ide, emit, det, total } = nfeData;
    const tpNF = Number(ide.tpNF);
    const isEntrada = tpNF === 0;
    const numeroNota = Number(ide.nNF) || 0;
    const serie = Number(ide.serie) || 1;
    const dataEmissao = ide.dEmi || "";
    const valorNota = Number(total.vNF) || 0;
    const chaveAcesso = ide.cNF || `${numeroNota}${serie}`;

    // Preview (não salva)
    if (!confirmar) {
      const fornecedorExistente = await prisma.supplier.findFirst({
        where: { tenantId, cnpj: String(emit.CNPJ || "").replace(/\D/g, "") || "" },
      });

      return NextResponse.json({
        preview: true,
        isSaida: !isEntrada,
        fornecedor: {
          cnpj: String(emit.CNPJ || ""),
          nome: emit.xNome || "",
          fantasia: emit.xFantasy || emit.xNome || "",
          ie: emit.IE || "",
          existente: !!fornecedorExistente,
          id: fornecedorExistente?.id || null,
        },
        itens: det.map((item: NFeItem, idx: number) => ({
          indice: idx + 1,
          codigo: item.cProd || "",
          nome: item.xProd || `Item ${idx + 1}`,
          ncm: item.NCM || "",
          cfop: item.CFOP || "",
          unidade: item.uCom || "UN",
          quantidade: Number(item.qCom) || 1,
          valorUnitario: Number(item.vUnCom) || 0,
          valorTotal: Number(item.vProd) || 0,
        })),
        documento: {
          chaveAcesso,
          numeroNota,
          serie,
          dataEmissao,
          valorTotal: valorNota,
          tipo: isEntrada ? "ENTRADA" : "SAIDA",
        },
      });
    }

    // Confirmado: salva no banco
    // 1. Fornecedor
    let fornecedor = fornecedorId
      ? await prisma.supplier.findFirst({ where: { id: fornecedorId, tenantId } })
      : null;

    if (!fornecedor && emit.CNPJ) {
      fornecedor = await prisma.supplier.findFirst({
        where: { tenantId, cnpj: String(emit.CNPJ || "").replace(/\D/g, "") },
      });
    }

    if (!fornecedor) {
      fornecedor = await prisma.supplier.create({
        data: {
          tenantId,
          nome: emit.xNome || "Fornecedor NF",
          cnpj: String(emit.CNPJ || "").replace(/\D/g, "") || null,
          contato: emit.xFantasy || null,
        },
      });
    }

    // 2. Gera número sequencial e cria transação
    const ultimaTransacao = await prisma.transaction.findFirst({
      where: { tenantId },
      orderBy: { numero: "desc" },
    });
    const proximoNumero = (ultimaTransacao?.numero || 0) + 1;

    const transaction = await prisma.transaction.create({
      data: {
        tenantId,
        numero: proximoNumero,
        tipo: "COMPRA",
        status: "COMPRA_REALIZADA",
        fornecedorId: fornecedor.id,
        observacoes: observacoes || `Importado NF ${numeroNota} série ${serie}`,
        subtotal: valorNota,
        total: valorNota,
        custoTotal: valorNota,
        criadorId: (session.user as any).id,
      },
    });

    // 3. Itens
    let totalItens = 0;
    for (const item of det) {
      const nome = item.xProd?.trim() || "Item";
      const quantidade = Number(item.qCom) || 1;
      const vUnit = Number(item.vUnCom) || 0;

      let parent = await prisma.productParent.findFirst({
        where: { tenantId, nome: { contains: nome.substring(0, 30) } },
      });

      if (!parent) {
        // Busca categoria padrão ou cria
        let categoria = await prisma.category.findFirst({
          where: { tenantId, nome: "Geral" },
        });
        if (!categoria) {
          const slug = "geral";
          categoria = await prisma.category.create({
            data: { tenantId, nome: "Geral", slug, hasImei: false },
          });
        }

        parent = await prisma.productParent.create({
          data: {
            tenantId,
            nome,
            sku: item.cProd || null,
            precoCusto: vUnit,
            categoriaId: categoria.id,
          },
        });
      }

      for (let i = 0; i < quantidade; i++) {
        const stockItem = await prisma.stockItem.create({
          data: {
            tenantId,
            parentId: parent.id,
            precoCusto: vUnit,
            status: "EM_ESTOQUE",
            dataEntrada: new Date(),
          },
        });

        await prisma.transactionItem.create({
          data: {
            tenantId,
            transacaoId: transaction.id,
            parentId: parent.id,
            stockItemId: stockItem.id,
            tipo: "COMPRA",
            quantidade: 1,
            precoUnit: vUnit,
            subtotal: vUnit,
          },
        });

        totalItens++;
      }
    }

    // 4. Documento
    await prisma.document.create({
      data: {
        tenantId,
        transacaoId: transaction.id,
        tipo: isEntrada ? "ENTRADA" : "SAIDA",
        conteudo: xmlContent,
        numero: numeroNota,
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      transactionNumero: transaction.numero,
      fornecedor: fornecedor.nome,
      totalItens,
      valorTotal: valorNota,
    });
  } catch (err: any) {
    console.error("Erro importação XML:", err);
    return NextResponse.json({ error: `Erro ao processar: ${err.message}` }, { status: 500 });
  }
}
