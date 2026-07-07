import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return <p className="p-6 text-gray-500">Não autenticado</p>;

  const tenantId = (session.user as any).tenantId;
  const hoje = startOfDay(new Date());
  const inicioMes = startOfMonth(new Date());
  const fimMes = endOfMonth(new Date());

  const [vendasHoje, estoqueCount, clientesCount, lucroMes] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: { tenantId, tipo: "VENDA", status: "CONCLUIDA", data: { gte: hoje } },
        _sum: { total: true },
      }),
      prisma.stockItem.count({ where: { tenantId, status: "EM_ESTOQUE" } }),
      prisma.client.count({ where: { tenantId } }),
      prisma.transaction.aggregate({
        where: { tenantId, tipo: "VENDA", status: "CONCLUIDA", data: { gte: inicioMes, lte: fimMes } },
        _sum: { lucro: true },
      }),
    ]);

  const cards = [
    {
      titulo: "Vendas Hoje",
      valor: formatCurrency(vendasHoje._sum.total || 0),
      icone: "💰",
      bg: "from-blue-500 to-blue-600",
      link: "/dashboard/vendas",
    },
    {
      titulo: "Produtos em Estoque",
      valor: String(estoqueCount),
      icone: "📦",
      bg: "from-emerald-500 to-emerald-600",
      link: "/dashboard/estoque",
    },
    {
      titulo: "Clientes",
      valor: String(clientesCount),
      icone: "👥",
      bg: "from-amber-500 to-amber-600",
      link: "/dashboard/clientes",
    },
    {
      titulo: "Lucro do Mês",
      valor: formatCurrency(lucroMes._sum.lucro || 0),
      icone: "📈",
      bg: "from-violet-500 to-violet-600",
      link: "/dashboard/financeiro",
    },
  ];

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Bem-vindo ao iCell ERP</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.titulo}
            href={card.link}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bg}`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{card.icone}</span>
                <span className="opacity-50 group-hover:opacity-100 transition-opacity text-sm">→</span>
              </div>
              <p className="text-sm font-medium text-white/80">{card.titulo}</p>
              <p className="mt-1 text-3xl font-bold">{card.valor}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">⚡ Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/dashboard/vendas/pdv"
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-green-200 transition-all active:scale-95"
          >
            <span className="text-3xl">🛒</span>
            <span className="text-sm font-medium text-gray-700">Nova Venda</span>
          </Link>
          <Link
            href="/dashboard/produtos/novo"
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-95"
          >
            <span className="text-3xl">📱</span>
            <span className="text-sm font-medium text-gray-700">Novo Produto</span>
          </Link>
          <Link
            href="/dashboard/clientes/novo"
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-95"
          >
            <span className="text-3xl">👤</span>
            <span className="text-sm font-medium text-gray-700">Novo Cliente</span>
          </Link>
          <Link
            href="/dashboard/estoque/laudos/novo"
            className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all active:scale-95"
          >
            <span className="text-3xl">🔍</span>
            <span className="text-sm font-medium text-gray-700">Laudo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
