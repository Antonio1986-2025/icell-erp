import OpenAI from "openai";
import prisma from "@/lib/prisma";

// OpenAI client criado sob demanda (lazy) pra não quebrar o build
function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });
}

const SYSTEM_PROMPT = `Você é o assistente virtual da iCell, uma loja de celulares e acessórios.

ATENDIMENTO:
- Seja simpático e profissional, como um vendedor de loja física
- Responda em português (pt-BR)
- Cliente pode perguntar sobre produtos, preços, estoque, trocas
- Se não souber responder algo, seja honesto e peça pra falar com vendedor

REGRAS IMPORTANTES:
- SEMPRE use as funções disponíveis para consultar o estoque real — NUNCA invente preços ou disponibilidade
- Antes de dizer que não tem um produto, SEMPRE chame buscar_produtos com o termo relevante
- Se o cliente perguntar "o que tem?" ou "quais produtos?", chame listar_estoque
- Preços em REAL (R$)
- SEMPRE pergunte se o cliente quer algo mais antes de encerrar
- Se for uma saudação (bom dia, oi, etc), apenas cumprimente e pergunte como pode ajudar
- Para troca/usado, use a função calcular_troca e explique que precisa trazer o aparelho na loja pra avaliação final`;

// Histórico temporário (em produção: Redis/Banco)
const historico = new Map<string, any[]>();

// Tools disponíveis para o OpenAI
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_produtos",
      description: "Busca produtos em estoque por nome, marca ou modelo",
      parameters: {
        type: "object",
        properties: {
          termo: {
            type: "string",
            description: "Termo de busca (nome, marca, modelo do produto)",
          },
          limite: {
            type: "number",
            description: "Quantidade máxima de resultados (padrão: 5)",
          },
        },
        required: ["termo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_produto_detalhes",
      description: "Busca detalhes completos de um produto específico pelo nome",
      parameters: {
        type: "object",
        properties: {
          produtoId: {
            type: "string",
            description: "ID do produto no banco",
          },
        },
        required: ["produtoId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_cliente",
      description: "Busca um cliente pelo telefone ou nome",
      parameters: {
        type: "object",
        properties: {
          termo: {
            type: "string",
            description: "Telefone ou nome do cliente",
          },
        },
        required: ["termo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_troca",
      description: "Calcula valor de troca com base em um produto e condição do aparelho usado",
      parameters: {
        type: "object",
        properties: {
          produtoNovo: {
            type: "string",
            description: "Nome do produto novo que o cliente quer",
          },
          modeloUsado: {
            type: "string",
            description: "Modelo do aparelho usado na troca",
          },
          condicao: {
            type: "string",
            enum: ["novo", "como_novo", "bom", "regular"],
            description: "Condição do aparelho usado",
          },
        },
        required: ["produtoNovo", "modeloUsado", "condicao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_estoque",
      description: "Lista todos os produtos disponíveis em estoque com preços e quantidades. Use quando o cliente perguntar 'o que tem?', 'quais produtos?', 'mostre o estoque'",
      parameters: {
        type: "object",
        properties: {
          limite: {
            type: "number",
            description: "Quantidade máxima de resultados (padrão: 10)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_por_categoria",
      description: "Busca produtos de uma categoria específica (ex: iPhones, Samsung, Acessórios, Apple Watch, MacBook, AirPods)",
      parameters: {
        type: "object",
        properties: {
          categoria: {
            type: "string",
            description: "Nome da categoria para buscar",
          },
        },
        required: ["categoria"],
      },
    },
  },
];

/**
 * Processa uma mensagem do WhatsApp e retorna a resposta
 */
export async function processarMensagem(mensagem: {
  from: string;
  texto: string;
  nome: string;
}): Promise<string | null> {
  const { from, texto, nome } = mensagem;

  if (!texto || texto.trim().length === 0) return null;

  // Recuperar ou iniciar histórico
  if (!historico.has(from)) {
    historico.set(from, [
      { role: "system", content: SYSTEM_PROMPT.replace("CLIENTE_NOME", nome) },
    ]);
  }

  const messages = historico.get(from)!;
  messages.push({ role: "user", content: texto });

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any[],
      tools: tools,
      tool_choice: "auto",
      max_tokens: 500,
      temperature: 0.7,
    });

    const choice = response.choices[0];

    // Se chamou uma ferramenta
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        const rawToolCall = toolCall as any;
        const args = JSON.parse(rawToolCall.function.arguments);
        let resultado: any;

        switch (rawToolCall.function.name) {
          case "buscar_produtos":
            resultado = await buscarProdutos(args.termo, args.limite || 5);
            break;
          case "buscar_produto_detalhes":
            resultado = await buscarProdutoDetalhes(args.produtoId);
            break;
          case "buscar_cliente":
            resultado = await buscarCliente(args.termo);
            break;
          case "calcular_troca":
            resultado = await calcularTroca(args);
            break;
          case "listar_estoque":
            resultado = await listarEstoque(args.limite || 10);
            break;
          case "buscar_por_categoria":
            resultado = await buscarPorCategoria(args.categoria);
            break;
          default:
            resultado = { erro: "Função desconhecida" };
        }

        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(resultado),
        });
      }

      // Segunda chamada com o resultado das ferramentas
      const response2 = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as any[],
        max_tokens: 500,
        temperature: 0.7,
      });

      const resposta = response2.choices[0].message.content;
      messages.push({ role: "assistant", content: resposta });
      return resposta;
    }

    // Resposta direta (sem ferramentas)
    const resposta = choice.message.content;
    messages.push({ role: "assistant", content: resposta });
    return resposta;
  } catch (error) {
    console.error("❌ Erro OpenAI:", error);
    return "😅 Desculpa, tive um problema pra processar sua mensagem. Pode tentar de novo ou falar com um vendedor?";
  }
}

// ─── FUNÇÕES DE CONSULTA ──────────────────────────────────

async function buscarProdutos(termo: string, limite: number = 5) {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return { erro: "Nenhuma loja configurada" };

    const produtos = await prisma.productParent.findMany({
      where: {
        tenantId: tenant.id,
        ativo: true,
        OR: [
          { nome: { contains: termo } },
          { marca: { contains: termo } },
          { modelo: { contains: termo } },
        ],
      },
      include: {
        stockItems: {
          where: { status: "EM_ESTOQUE" },
          select: { id: true, precoVenda: true, cor: true, capacidade: true, condicao: true },
        },
      },
      take: limite,
    });

    if (produtos.length === 0) {
      return { mensagem: `Nenhum produto encontrado para "${termo}"`, produtos: [] };
    }

    return {
      produtos: produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        marca: p.marca,
        preco: p.precoVenda,
        emEstoque: p.stockItems.length,
        variacoes: p.stockItems.map((s) => ({
          cor: s.cor,
          capacidade: s.capacidade,
          preco: s.precoVenda,
          condicao: s.condicao,
        })),
      })),
    };
  } catch (error) {
    console.error("Erro buscarProdutos:", error);
    return { erro: "Erro ao consultar produtos" };
  }
}

async function buscarProdutoDetalhes(produtoId: string) {
  try {
    const produto = await prisma.productParent.findUnique({
      where: { id: produtoId },
      include: {
        stockItems: {
          where: { status: "EM_ESTOQUE" },
          orderBy: { precoVenda: "asc" },
        },
        categoria: { select: { nome: true } },
      },
    });

    if (!produto) return { erro: "Produto não encontrado" };

    return {
      nome: produto.nome,
      marca: produto.marca,
      modelo: produto.modelo,
      categoria: produto.categoria?.nome,
      descricao: produto.descricao,
      precoAPartir: produto.precoVenda,
      garantia: produto.garantiaPadrao ? `${produto.garantiaPadrao} meses` : "12 meses",
      emEstoque: produto.stockItems.length,
      estoque: produto.stockItems.map((s) => ({
        imei: s.imei,
        cor: s.cor,
        capacidade: s.capacidade,
        preco: s.precoVenda,
        condicao: s.condicao,
      })),
    };
  } catch (error) {
    console.error("Erro buscarProdutoDetalhes:", error);
    return { erro: "Erro ao consultar detalhes" };
  }
}

async function buscarCliente(termo: string) {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return { erro: "Nenhuma loja configurada" };

    const cliente = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { telefone: { contains: termo } },
          { nome: { contains: termo } },
          { cpf: { contains: termo } },
        ],
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        totalCompras: true,
        ultimaCompra: true,
      },
    });

    if (!cliente) return { mensagem: "Cliente não encontrado" };

    return {
      nome: cliente.nome,
      telefone: cliente.telefone,
      totalCompras: cliente.totalCompras,
      ultimaCompra: cliente.ultimaCompra,
    };
  } catch (error) {
    console.error("Erro buscarCliente:", error);
    return { erro: "Erro ao consultar cliente" };
  }
}

async function calcularTroca(args: { produtoNovo: string; modeloUsado: string; condicao: string }) {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return { erro: "Nenhuma loja configurada" };

    // Buscar o produto novo
    const produtoNovo = await prisma.productParent.findFirst({
      where: {
        tenantId: tenant.id,
        nome: { contains: args.produtoNovo },
        ativo: true,
      },
      select: { id: true, nome: true, precoVenda: true },
    });

    if (!produtoNovo) return { erro: "Produto novo não encontrado" };

    // Tabela de deságio por condição
    const desagios: Record<string, number> = {
      novo: 0.7,
      como_novo: 0.55,
      bom: 0.4,
      regular: 0.25,
    };

    const desagio = desagios[args.condicao] || 0.3;
    const valorBase = produtoNovo.precoVenda || 0;

    return {
      produtoNovo: {
        nome: produtoNovo.nome,
        preco: valorBase,
      },
      aparelhoUsado: {
        modelo: args.modeloUsado,
        condicao: args.condicao,
        valorEstimadoTroca: Math.round(valorBase * desagio),
      },
      valorAPagar: Math.round(valorBase - valorBase * desagio),
      aviso: "⚠️ Valor estimado. A avaliação final é feita na loja com o aparelho em mãos.",
    };
  } catch (error) {
    console.error("Erro calcularTroca:", error);
    return { erro: "Erro ao calcular troca" };
  }
}

async function listarEstoque(limite: number = 10) {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return { erro: "Nenhuma loja configurada" };

    const produtos = await prisma.productParent.findMany({
      where: { tenantId: tenant.id, ativo: true },
      include: {
        _count: { select: { stockItems: { where: { status: "EM_ESTOQUE" } } } },
        categoria: { select: { nome: true } },
      },
      orderBy: { precoVenda: "asc" },
      take: limite,
    });

    if (produtos.length === 0) {
      return { mensagem: "Nenhum produto disponível no momento", produtos: [] };
    }

    return {
      produtos: produtos.map((p) => ({
        nome: p.nome,
        marca: p.marca,
        preco: p.precoVenda,
        categoria: p.categoria?.nome || "Geral",
        emEstoque: p._count.stockItems,
      })),
    };
  } catch (error) {
    console.error("Erro listarEstoque:", error);
    return { erro: "Erro ao consultar estoque" };
  }
}

async function buscarPorCategoria(categoria: string) {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return { erro: "Nenhuma loja configurada" };

    const cat = await prisma.category.findFirst({
      where: {
        tenantId: tenant.id,
        nome: { contains: categoria, mode: "insensitive" },
      },
    });

    if (!cat) return { mensagem: `Categoria "${categoria}" não encontrada`, produtos: [] };

    const produtos = await prisma.productParent.findMany({
      where: { tenantId: tenant.id, categoriaId: cat.id, ativo: true },
      include: {
        _count: { select: { stockItems: { where: { status: "EM_ESTOQUE" } } } },
      },
      orderBy: { precoVenda: "asc" },
    });

    if (produtos.length === 0) {
      return { mensagem: `Nenhum produto na categoria "${categoria}"`, produtos: [] };
    }

    return {
      categoria: cat.nome,
      produtos: produtos.map((p) => ({
        nome: p.nome,
        marca: p.marca,
        preco: p.precoVenda,
        emEstoque: p._count.stockItems,
      })),
    };
  } catch (error) {
    console.error("Erro buscarPorCategoria:", error);
    return { erro: "Erro ao consultar categoria" };
  }
}
