type ExtractedProduct = {
  descricao: string;
  marca?: string;
  modelo?: string;
  capacidade?: string;
  precoUsd: number;
  codigo?: string;
  condicao?: string;
};

/**
 * Extrai produtos de um PDF
 */
export async function extractFromPdf(buffer: Buffer): Promise<ExtractedProduct[]> {
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return parseTextLines(data.text);
}

/**
 * Extrai produtos de uma planilha Excel
 */
export async function extractFromXlsx(buffer: Buffer): Promise<ExtractedProduct[]> {
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const products: ExtractedProduct[] = [];

  for (const row of rows) {
    const values = Object.values(row) as any[];
    const descCol = values.find(
      (v) =>
        typeof v === "string" &&
        /IPHONE|APPLE|IPAD|MACBOOK|AIRPODS|WATCH|SAMSUNG|GALAXY|MOTOROLA|XIAOMI/i.test(v)
    );
    const priceCol = values.find(
      (v) => typeof v === "number" || (typeof v === "string" && /^\d+[.,]?\d*$/.test(v.trim()))
    );

    if (descCol && priceCol) {
      const price = typeof priceCol === "number" ? priceCol : parseFloat(priceCol.replace(",", "."));
      if (price > 0) products.push(parseProductLine(descCol, price));
    }
  }

  return products;
}

/**
 * Extrai produtos de texto puro (fallback)
 */
export function extractFromText(text: string): ExtractedProduct[] {
  return parseTextLines(text);
}

function parseTextLines(text: string): ExtractedProduct[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const products: ExtractedProduct[] = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const hasProduct = /IPHONE|APPLE|MACBOOK|AIRPODS|WATCH|IPAD|SAMSUNG|GALAXY/i.test(trimmed);
    if (hasProduct) started = true;
    if (!started) continue;

    // Procura preço: U$ 1.190, $425, 1190.00
    const priceMatch = trimmed.match(
      /(?:U?\$)\s*([\d.,]+)|(?:R?\$)\s*([\d.,]+)|(?:^|\s)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*$/i
    );
    if (!priceMatch) continue;

    const priceStr = priceMatch[1] || priceMatch[2] || priceMatch[3];
    const price = parseFloat(priceStr.replace(/\./g, "").replace(",", "."));
    if (price > 0 && price < 100000) {
      products.push(parseProductLine(trimmed, price));
    }
  }

  return products;
}

function parseProductLine(descricao: string, precoUsd: number): ExtractedProduct {
  const clean = descricao.replace(/U?\$[\s\d.,]+/gi, "").trim();
  const marca = "APPLE";

  const modelMatch = clean.match(/(IPHONE\s+\d+\s*(?:PRO\s*MAX|PRO|PLUS|E)?)/i);
  const modelo = modelMatch ? modelMatch[1].toUpperCase() : undefined;

  const capMatch = clean.match(/(\d+)\s*(GB|TB)/i);
  const capacidade = capMatch ? capMatch[0].toUpperCase() : undefined;

  return {
    descricao: clean,
    marca,
    modelo,
    capacidade,
    precoUsd,
    condicao: clean.toUpperCase().includes("SWAP") || clean.toUpperCase().includes("USADO") ? "seminovo" : "novo",
  };
}

export type { ExtractedProduct };
