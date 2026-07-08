import { NextResponse } from "next/server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "icell";

/**
 * POST /api/whatsapp/disconnect
 * Desconecta a instância WhatsApp
 */
export async function POST() {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json(
        { error: "Evolution API não configurada" },
        { status: 400 }
      );
    }

    // Desconecta a instância
    const res = await fetch(
      `${EVOLUTION_API_URL}/instance/logout/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: EVOLUTION_API_KEY,
        },
      }
    );

    if (!res.ok) {
      // Se der 404, a instância não existe - tudo bem
      if (res.status === 404) {
        return NextResponse.json({ success: true, message: "Instância não encontrada" });
      }
      const erro = await res.text();
      return NextResponse.json(
        { error: `Evolution API: ${res.status} - ${erro}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      instance: EVOLUTION_INSTANCE,
      message: "Desconectado com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao desconectar WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao desconectar WhatsApp" },
      { status: 500 }
    );
  }
}
