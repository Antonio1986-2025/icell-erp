import { NextResponse } from "next/server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "icell";

/**
 * POST /api/whatsapp/connect
 * Conecta a instância WhatsApp e retorna o QR Code
 */
export async function POST() {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json(
        { error: "Evolution API não configurada" },
        { status: 400 }
      );
    }

    // 1. Tenta criar a instância (se já existir, ignora erro)
    await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName: EVOLUTION_INSTANCE,
        token: `${EVOLUTION_INSTANCE}-token-whatsapp`,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    }).catch(() => {});

    // 2. Conecta e obtém o QR Code
    const res = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: EVOLUTION_API_KEY,
        },
      }
    );

    if (!res.ok) {
      const erro = await res.text();
      return NextResponse.json(
        { error: `Evolution API: ${res.status} - ${erro}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const qrBase64 = data?.qrcode?.base64 || null;

    return NextResponse.json({
      instance: EVOLUTION_INSTANCE,
      qrcode: qrBase64,
      status: "awaiting_scan",
    });
  } catch (error: any) {
    console.error("Erro ao conectar WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao conectar WhatsApp" },
      { status: 500 }
    );
  }
}
