import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/whatsapp/debug-webhook
 * Endpoint de debug para ver o formato exato do webhook da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();
    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = { raw: rawText };
    }

    const resposta: any = {
      recebido: true,
      headers: Object.fromEntries(request.headers.entries()),
      bodyKeys: Object.keys(json),
      bodyPreview: JSON.stringify(json).slice(0, 2000),
      tipoEvento: json.event || json.type || "desconhecido",
    };

    // Tentar extrair informação de mensagem
    if (json.data?.key?.remoteJid) {
      resposta.formatoDetectado = "data.key.remoteJid (v2)";
      resposta.remoteJid = json.data.key.remoteJid;
      if (json.data.message?.conversation) {
        resposta.texto = json.data.message.conversation;
      } else if (json.data.message?.extendedTextMessage?.text) {
        resposta.texto = json.data.message.extendedTextMessage.text;
      }
    } else if (json.remoteJid) {
      resposta.formatoDetectado = "remoteJid direto (v1)";
      resposta.remoteJid = json.remoteJid;
      resposta.texto = json.message;
    }

    return NextResponse.json(resposta);
  } catch (error: any) {
    return NextResponse.json({ erro: error.message, stack: error.stack }, { status: 500 });
  }
}

/**
 * GET - para testar se o endpoint existe
 */
export async function GET() {
  return NextResponse.json({ status: "endpoint de debug ativo" });
}
