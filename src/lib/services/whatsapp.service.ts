const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "icell";

/**
 * Envia uma mensagem de texto via Evolution API
 */
export async function enviarMensagem(para: string, texto: string): Promise<boolean> {
  try {
    if (!EVOLUTION_API_URL) {
      console.warn("⚠️ EVOLUTION_API_URL não configurada");
      return false;
    }

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: para,        // 5567999999999
          text: texto,
          delay: 1000,
        }),
      }
    );

    if (!response.ok) {
      const erro = await response.text();
      console.error(`❌ Evolution sendText: ${response.status} - ${erro}`);
      return false;
    }

    console.log(`✅ Mensagem enviada para ${para}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error);
    return false;
  }
}

/**
 * Marca mensagem como lida
 */
export async function marcarLida(remoteJid: string, messageId: string): Promise<boolean> {
  try {
    if (!EVOLUTION_API_URL) return false;

    await fetch(
      `${EVOLUTION_API_URL}/chat/markMessageAsRead/${EVOLUTION_INSTANCE}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          remoteJid,
          messageId,
        }),
      }
    );
    return true;
  } catch {
    return false;
  }
}
