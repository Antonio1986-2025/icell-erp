import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient();

const xlsxPath = process.argv[2] || path.resolve("C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\tac_full.xlsx");

async function main() {
  console.log("Lendo XLSX...");
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets["ALL"];
  const rows = XLSX.utils.sheet_to_json(ws);

  console.log(`Total de linhas: ${rows.length}`);
  console.log("Limpando tabela existente...");
  await prisma.deviceModel.deleteMany();

  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((r) => ({
      brand: String(r.Brand || "").trim(),
      tac: String(r.TAC || "").trim(),
      specs: String(r.SPECS || "").trim(),
    }));

    try {
      await prisma.deviceModel.createMany({ data: batch });
      inserted += batch.length;
    } catch (e) {
      for (const item of batch) {
        try {
          await prisma.deviceModel.create({ data: item });
          inserted++;
        } catch { /* dup */ }
      }
    }
    console.log(`${inserted}/${rows.length} importados...`);
  }

  console.log(`Importação concluída! ${inserted} registros.`);

  const tac = "35568866";
  const found = await prisma.deviceModel.findUnique({ where: { tac } });
  if (found) {
    console.log("Teste TAC 35568866:", JSON.stringify(found));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
