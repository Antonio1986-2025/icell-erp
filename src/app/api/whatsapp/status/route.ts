import { NextResponse } from "next/server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "icell";

/**
 * GET /api/whatsapp/status
 * Retorna o status da conexão WhatsApp
 */
export async function GET() {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json(
        { error: "Evolution API não configurada" },
        { status: 400 }
      );
    }

    // Tenta buscar informações da instância
    const res = await fetch(
      `${EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        method: "GET",
        headers: {
          apiKey: EVOLUTION_API_KEY,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        instance: EVOLUTION_INSTANCE,
        status: "not_found",
      });
    }

    const data = await res.json();
    const instance = Array.isArray(data)
      ? data.find((i: any) => i.name === EVOLUTION_INSTANCE)
      : null;

    const connectionState = instance?.connectionStatus || "disconnected";
    const isConnected = connectionState === "open";

    return NextResponse.json({
      connected: isConnected,
      instance: EVOLUTION_INSTANCE,
      status: isConnected ? "connected" : connectionState,
    });
  } catch (error: any) {
    console.error("Erro ao verificar status WhatsApp:", error);
    return NextResponse.json(
      { connected: false, error: error.message, status: "error" },
      { status: 500 }
    );
  }
}
