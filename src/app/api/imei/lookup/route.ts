import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imei = searchParams.get("imei")?.replace(/\D/g, "").trim();

  if (!imei || imei.length < 8) {
    return NextResponse.json({ error: "IMEI inválido. Mínimo 8 dígitos." }, { status: 400 });
  }

  const tac = imei.slice(0, 8);

  const device = await prisma.deviceModel.findUnique({
    where: { tac },
    select: { brand: true, specs: true, tac: true },
  });

  if (!device) {
    return NextResponse.json({ error: "TAC não encontrado no banco local.", tac }, { status: 404 });
  }

  const specs = device.specs.split(",").map((s: string) => s.trim());
  const modelName = specs[0] || "";
  const aparelhoNome = modelName.startsWith(device.brand) ? modelName : `${device.brand} ${modelName}`;

  return NextResponse.json({
    tac: device.tac,
    brand: device.brand,
    modelName,
    aparelhoNome,
    specs: device.specs,
  });
}
