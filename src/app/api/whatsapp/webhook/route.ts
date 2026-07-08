import { NextRequest, NextResponse } from "next/server";
import { processarMensagem } from "@/lib/services/ai-assistant.service";
import { enviarMensagem } from "@/lib/services/whatsapp.service";

/**
 * Webhook chamado pela Evolution API quando chega uma mensagem no WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📩 Webhook Evolution:", JSON.stringify(body).slice(0, 500));

    // Evolution API envia eventos de mensagem com este formato
    const eventType = body.event || body.type;
    const data = body.data || body;

    // Só processar mensagens de texto de usuários (ignorar status, QR, etc)
    if (eventType === "messages.upsert" || data?.key?.remoteJid) {
      const mensagem = extrairMensagem(body);
      if (mensagem) {
        const resposta = await processarMensagem(mensagem);
        if (resposta) {
          await enviarMensagem(mensagem.from, resposta);
        }
      }
    }

    // Sempre retornar 200 pra Evolution não reenviar
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return NextResponse.json({ status: "ok" }); // Sempre 200
  }
}

function extrairMensagem(body: any): MensagemWhatsApp | null {
  // Formato Evolution API v2
  if (body.data?.key?.remoteJid && body.data?.message?.conversation) {
    return {
      from: body.data.key.remoteJid.replace(/[^0-9]/g, ""),
      texto: body.data.message.conversation,
      nome: body.data.pushName || "Cliente",
      instancia: body.instance || "",
    };
  }

  // Formato Evolution API v1
  if (body.remoteJid && body.message) {
    return {
      from: body.remoteJid.replace(/[^0-9]/g, ""),
      texto: body.message,
      nome: body.pushName || "Cliente",
      instancia: body.instance || "",
    };
  }

  return null;
}

export interface MensagemWhatsApp {
  from: string;
  texto: string;
  nome: string;
  instancia: string;
}
