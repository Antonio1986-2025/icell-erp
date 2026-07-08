import { NextRequest, NextResponse } from "next/server";
import { processarMensagem } from "@/lib/services/ai-assistant.service";
import { enviarMensagem } from "@/lib/services/whatsapp.service";

/**
 * POST /api/whatsapp/testar
 * Testa o assistente enviando uma mensagem de texto
 * Body: { "mensagem": "quanto tá o iphone 15?", "telefone": "5567999999999" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensagem, telefone } = body;

    if (!mensagem) {
      return NextResponse.json({ erro: "Campo 'mensagem' é obrigatório" }, { status: 400 });
    }

    console.log(`🧪 Teste: processando "${mensagem}"`);

    const resposta = await processarMensagem({
      from: telefone || "5599999999999",
      texto: mensagem,
      nome: body.nome || "Cliente Teste",
    });

    return NextResponse.json({
      mensagemRecebida: mensagem,
      respostaGerada: resposta,
      enviadoWhatsApp: telefone ? true : false,
    });
  } catch (error: any) {
    console.error("Erro no teste:", error);
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
