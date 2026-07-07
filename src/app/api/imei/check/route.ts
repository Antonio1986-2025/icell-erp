import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const API_KEY = process.env.IMEICHECK_API_KEY;
const BASE_URL = "https://alpha.imeicheck.com/api/php-api";

async function callImeiCheck(service: number, imei: string) {
  const url = `${BASE_URL}/create?key=${API_KEY}&service=${service}&imei=${imei}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

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

  let tacInfo = null;
  if (device) {
    const specs = device.specs.split(",").map((s: string) => s.trim());
    const modelName = specs[0] || "";
    const aparelhoNome = modelName.startsWith(device.brand) ? modelName : `${device.brand} ${modelName}`;
    tacInfo = { tac: device.tac, brand: device.brand, modelName, aparelhoNome, specs: device.specs };
  }

  const [fmiRes, detalhesRes, blacklistRes, simlockRes, balanceRes] = await Promise.allSettled([
    callImeiCheck(1, imei),
    callImeiCheck(13, imei),
    callImeiCheck(5, imei),
    callImeiCheck(73, imei),
    fetch(`${BASE_URL}/balance?key=${API_KEY}`, { signal: AbortSignal.timeout(10000) }).then((r) => r.json()),
  ]);

  const result: Record<string, any> = { tac: tacInfo, services: {} };

  if (fmiRes.status === "fulfilled") {
    result.services.fmi = { status: fmiRes.value.status || "error", data: fmiRes.value.object || fmiRes.value.result };
  } else {
    result.services.fmi = { error: fmiRes.reason?.message || "Falha na consulta FMI" };
  }

  if (detalhesRes.status === "fulfilled") {
    const obj = detalhesRes.value.object || {};
    result.services.detalhes = { status: detalhesRes.value.status || "error", data: obj };
  } else {
    result.services.detalhes = { error: detalhesRes.reason?.message || "Falha na consulta de detalhes" };
  }

  if (blacklistRes.status === "fulfilled") {
    const obj = blacklistRes.value.object || {};
    result.services.blacklist = { status: blacklistRes.value.status || "error", data: obj };
  } else {
    result.services.blacklist = { error: blacklistRes.reason?.message || "Falha na consulta de blacklist" };
  }

  if (simlockRes.status === "fulfilled") {
    const data = simlockRes.value;
    const unlocked = data.result?.toLowerCase?.().includes("unlocked") ?? null;
    result.services.simlock = { status: data.status || "error", data: { unlocked, raw: data.result } };
  } else {
    result.services.simlock = { error: simlockRes.reason?.message || "Falha na consulta SIM Lock" };
  }

  if (balanceRes.status === "fulfilled") {
    result.balance = balanceRes.value.balance || "unknown";
  }

  return NextResponse.json(result);
}
