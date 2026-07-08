import { NextRequest, NextResponse } from "next/server";
import { processarMensagem } from "@/lib/services/ai-assistant.service";
import { enviarMensagem } from "@/lib/services/whatsapp.service";

/**
 * Webhook chamado pela Evolution API quando chega uma mensagem no WhatsApp
 * Suporta Evolution API v2.3.7 e versões anteriores
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📩 Webhook Evolution RECEBIDO:", JSON.stringify(body).slice(0, 1000));

    // Extrair mensagem do formato Evolution API (qualquer versão)
    const mensagemExtraida = extrairMensagem(body);

    if (mensagemExtraida) {
      console.log(`📨 Mensagem de ${mensagemExtraida.nome} (${mensagemExtraida.from}): "${mensagemExtraida.texto}"`);
      
      const resposta = await processarMensagem(mensagemExtraida);
      if (resposta) {
        console.log(`🤖 Resposta gerada: "${resposta.slice(0, 100)}..."`);
        const enviado = await enviarMensagem(mensagemExtraida.from, resposta);
        console.log(`📤 Envio para ${mensagemExtraida.from}: ${enviado ? "SUCESSO" : "FALHA"}`);
      }
    } else {
      console.log("⏭️ Evento ignorado (não é mensagem de texto):", body.event || body.type || "desconhecido");
    }

    // Sempre retornar 200 pra Evolution não reenviar
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return NextResponse.json({ status: "ok" }); // Sempre 200
  }
}

function extrairMensagem(body: any): MensagemWhatsApp | null {
  // ─── Evolution API v2.3.7 (formato mais comum) ───
  // { event: "messages.upsert", instance: "icell", data: { key: {...}, message: {...}, pushName: "..." } }

  // Tentar extrair de body.data (v2)
  if (body.data) {
    const data = body.data;
    // Pular mensagens enviadas pelo próprio bot
    if (data.key?.fromMe) return null;

    const texto = extrairTexto(data.message);
    if (texto && data.key?.remoteJid) {
      return {
        from: data.key.remoteJid.replace(/[^0-9]/g, ""),
        texto: texto,
        nome: data.pushName || data.participant || "Cliente",
        instancia: body.instance || "",
      };
    }
  }

  // Formato v1 (body direto sem wrapper)
  // { remoteJid: "...", message: { conversation: "..." } }
  if (body.remoteJid && !body.key?.fromMe) {
    const texto = extrairTexto(body.message);
    if (texto) {
      return {
        from: body.remoteJid.replace(/[^0-9]/g, ""),
        texto: texto,
        nome: body.pushName || "Cliente",
        instancia: body.instance || "",
      };
    }
  }

  // Formato alternativo: body já é o objeto message direto
  if (body.key?.remoteJid && !body.key?.fromMe) {
    const texto = extrairTexto(body.message);
    if (texto) {
      return {
        from: body.key.remoteJid.replace(/[^0-9]/g, ""),
        texto: texto,
        nome: body.pushName || "Cliente",
        instancia: body.instance || "",
      };
    }
  }

  return null;
}

/**
 * Extrai o texto de uma mensagem, independente do formato
 */
function extrairTexto(message: any): string | null {
  if (!message) return null;

  // conversation text
  if (typeof message === "string") return message;
  if (message.conversation) return message.conversation;
  
  // extended text message
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  
  // image/video with caption
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;

  // buttons response
  if (message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
  if (message.buttonsResponseMessage?.selectedDisplayText) return message.buttonsResponseMessage.selectedDisplayText;

  // list response
  if (message.listResponseMessage?.singleSelectReply?.selectedRowId) return message.listResponseMessage.singleSelectReply.selectedRowId;
  if (message.listResponseMessage?.title) return message.listResponseMessage.title;

  // template
  if (message.templateMessage?.hydratedTemplate?.hydratedContentText) return message.templateMessage.hydratedTemplate.hydratedContentText;

  return null;
}

export interface MensagemWhatsApp {
  from: string;
  texto: string;
  nome: string;
  instancia: string;
}
