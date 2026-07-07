import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, startOfMonth, subMonths } from "date-fns";
import Link from "next/link";

async function getRelatorios(tenantId: string, periodo?: string) {
  const agora = new Date();
  const meses = periodo ? parseInt(periodo) : 6;
  const dataInicio = startOfMonth(subMonths(agora, meses));

  // Vendas do período
  const vendas = await prisma.transaction.findMany({
    where: {
      tenantId,
      tipo: "VENDA",
      status: "CONCLUIDA",
      data: { gte: dataInicio },
    },
    include: {
      items: {
        include: { parent: { select: { nome: true, marca: true } } },
      },
      payments: true,
      cliente: { select: { nome: true } },
    },
    orderBy: { data: "desc" },
  });

  // Contas a pagar pendentes
  const [contasPagar, contasReceber] = await Promise.all([
    prisma.accountPayable.aggregate({
      where: { tenantId, status: "PENDENTE" },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.accountReceivable.aggregate({
      where: { tenantId, status: "PENDENTE" },
      _sum: { valor: true },
      _count: true,
    }),
  ]);

  // Totais
  const totalVendas = vendas.length;
  const receitaTotal = vendas.reduce((s, v) => s + v.total, 0);
  const custoTotal = vendas.reduce((s, v) => s + v.custoTotal, 0);
  const lucroTotal = vendas.reduce((s, v) => s + v.lucro, 0);
  const margemMedia =
    receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;

  // Vendas por mês (últimos 6 meses)
  const vendasPorMes: { mes: string; receita: number; custo: number; lucro: number; qtd: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const ini = startOfMonth(subMonths(agora, i));
    const fim = startOfMonth(subMonths(agora, i - 1));
    const doMes = vendas.filter((v) => v.data >= ini && v.data < fim);
    const r = doMes.reduce((s, v) => s + v.total, 0);
    const c = doMes.reduce((s, v) => s + v.custoTotal, 0);
    vendasPorMes.push({
      mes: ini.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      receita: r,
      custo: c,
      lucro: r - c,
      qtd: doMes.length,
    });
  }

  // Produtos mais vendidos
  const produtosVendidos = new Map<
    string,
    { nome: string; qtd: number; total: number }
  >();
  for (const v of vendas) {
    for (const item of v.items) {
      const nome = item.parent?.nome || item.tipo;
      const existente = produtosVendidos.get(nome) || {
        nome,
        qtd: 0,
        total: 0,
      };
      existente.qtd += item.quantidade;
      existente.total += item.subtotal;
      produtosVendidos.set(nome, existente);
    }
  }
  const topProdutos = Array.from(produtosVendidos.values())
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  // Métodos de pagamento
  const metodosPagamento = new Map<string, { valor: number; qtd: number }>();
  for (const v of vendas) {
    for (const p of v.payments) {
      const existente = metodosPagamento.get(p.metodo) || { valor: 0, qtd: 0 };
      existente.valor += p.valor;
      existente.qtd++;
      metodosPagamento.set(p.metodo, existente);
    }
  }
  const metodos = Array.from(metodosPagamento.entries())
    .map(([metodo, dados]) => ({ metodo, ...dados }))
    .sort((a, b) => b.valor - a.valor);

  // Top clientes
  const comprasPorCliente = new Map<
    string,
    { nome: string; qtd: number; total: number }
  >();
  for (const v of vendas) {
    if (!v.cliente) continue;
    const nome = v.cliente.nome;
    const existente = comprasPorCliente.get(nome) || {
      nome,
      qtd: 0,
      total: 0,
    };
    existente.qtd++;
    existente.total += v.total;
    comprasPorCliente.set(nome, existente);
  }
  const topClientes = Array.from(comprasPorCliente.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    resumo: {
      totalVendas,
      receitaTotal,
      custoTotal,
      lucroTotal,
      margemMedia,
      contasPagar: contasPagar._sum.valor || 0,
      contasPagarCount: contasPagar._count,
      contasReceber: contasReceber._sum.valor || 0,
      contasReceberCount: contasReceber._count,
    },
    vendasPorMes,
    topProdutos,
    metodosPagamento: metodos,
    topClientes,
  };
}

function BarraProgresso({
  valor,
  max,
  cor,
}: {
  valor: number;
  max: number;
  cor: string;
}) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cor}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    return <p className="p-6 text-gray-500">Acesso não autorizado</p>;
  }
  const tenantId = (session.user as any).tenantId;
  const { periodo } = await searchParams;
  const dados = await getRelatorios(tenantId, periodo);

  const r = dados.resumo;
  const maiorMes = Math.max(...dados.vendasPorMes.map((m) => m.receita), 1);
  const maiorPagamento = Math.max(
    ...dados.metodosPagamento.map((m) => m.valor),
    1
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📈 Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Resumo de vendas e financeiro da loja
          </p>
        </div>
        <form className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Período:</label>
          <select
            name="periodo"
            defaultValue={periodo || "6"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (form) form.submit();
            }}
          >
            <option value="1">Último mês</option>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Último ano</option>
          </select>
        </form>
      </div>

      {/* Cards de resumo */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">
            Receita
          </p>
          <p className="mt-1 text-xl font-bold text-green-800">
            {formatCurrency(r.receitaTotal)}
          </p>
          <p className="mt-1 text-xs text-green-600">
            {r.totalVendas} venda{r.totalVendas !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">
            Custos
          </p>
          <p className="mt-1 text-xl font-bold text-red-800">
            {formatCurrency(r.custoTotal)}
          </p>
          <p className="mt-1 text-xs text-red-600">
            {r.margemMedia.toFixed(1)}% margem
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Lucro
          </p>
          <p className="mt-1 text-xl font-bold text-blue-800">
            {formatCurrency(r.lucroTotal)}
          </p>
          <p className="mt-1 text-xs text-blue-600">
            {r.margemMedia.toFixed(1)}% de margem
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            A Pagar / Receber
          </p>
          <p className="mt-1 text-xl font-bold text-amber-800">
            {formatCurrency(r.contasPagar)}
          </p>
          <p className="mt-1 text-xs text-amber-600">
            Receber: {formatCurrency(r.contasReceber)}
          </p>
        </div>
      </div>

      {/* Gráfico de vendas por mês */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">
          Vendas por Mês
        </h2>
        <div className="mt-3 space-y-2">
          {dados.vendasPorMes.map((mes) => (
            <div
              key={mes.mes}
              className="rounded-lg border border-gray-100 bg-white p-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{mes.mes}</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(mes.receita)}
                </span>
              </div>
              <BarraProgresso
                valor={mes.receita}
                max={maiorMes}
                cor="bg-blue-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>{mes.qtd} venda{mes.qtd !== 1 ? "s" : ""}</span>
                <span>Lucro: {formatCurrency(mes.lucro)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Produtos mais vendidos */}
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Produtos Mais Vendidos
          </h2>
          <div className="mt-3 space-y-2">
            {dados.topProdutos.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhum produto vendido no período
              </p>
            )}
            {dados.topProdutos.map((p, i) => (
              <div
                key={p.nome}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {p.nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.qtd} unidade{p.qtd !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(p.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Métodos de pagamento */}
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Formas de Pagamento
          </h2>
          <div className="mt-3 space-y-2">
            {dados.metodosPagamento.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhum pagamento registrado
              </p>
            )}
            {dados.metodosPagamento.map((m) => (
              <div
                key={m.metodo}
                className="rounded-lg border border-gray-100 bg-white p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {m.metodo}
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(m.valor)}
                  </span>
                </div>
                <BarraProgresso
                  valor={m.valor}
                  max={maiorPagamento}
                  cor="bg-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {m.qtd} transação{m.qtd !== 1 ? "ões" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top clientes */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Top Clientes</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dados.topClientes.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhum cliente no período
            </p>
          )}
          {dados.topClientes.map((c, i) => (
            <div
              key={c.nome}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                <p className="text-xs text-gray-500">
                  {c.qtd} compra{c.qtd !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(c.total)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
