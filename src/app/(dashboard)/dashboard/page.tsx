import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return <p>Não autenticado</p>;

  const tenantId = (session.user as any).tenantId;
  const hoje = startOfDay(new Date());
  const inicioMes = startOfMonth(new Date());
  const fimMes = endOfMonth(new Date());

  const [
    vendasHoje,
    estoqueCount,
    clientesCount,
    lucroMes
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        tenantId,
        tipo: "VENDA",
        status: "CONCLUIDA",
        data: { gte: hoje },
      },
      _sum: { total: true },
    }),
    prisma.stockItem.count({
      where: { tenantId, status: "EM_ESTOQUE" },
    }),
    prisma.client.count({
      where: { tenantId },
    }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        tipo: "VENDA",
        status: "CONCLUIDA",
        data: { gte: inicioMes, lte: fimMes },
      },
      _sum: { lucro: true },
    }),
  ]);

  const cards = [
    {
      titulo: "Vendas Hoje",
      valor: formatCurrency(vendasHoje._sum.total || 0),
      cor: "text-green-600",
      bg: "bg-green-50",
      link: "/dashboard/vendas",
    },
    {
      titulo: "Produtos em Estoque",
      valor: String(estoqueCount),
      cor: "text-blue-600",
      bg: "bg-blue-50",
      link: "/dashboard/estoque",
    },
    {
      titulo: "Clientes Cadastrados",
      valor: String(clientesCount),
      cor: "text-amber-600",
      bg: "bg-amber-50",
      link: "/dashboard/clientes",
    },
    {
      titulo: "Lucro do Mês",
      valor: formatCurrency(lucroMes._sum.lucro || 0),
      cor: "text-green-600",
      bg: "bg-green-50",
      link: "/dashboard/financeiro",
    },
  ];

  return (
    <div className="pb-4 md:pb-0">
      <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Bem-vindo ao iCell ERP</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.titulo}
            href={card.link}
            className={`rounded-xl border border-gray-200 ${card.bg} p-5 transition active:scale-[0.98] hover:shadow-sm`}
          >
            <p className="text-sm font-medium text-gray-500">{card.titulo}</p>
            <p className={`mt-2 text-2xl font-bold md:text-3xl ${card.cor}`}>
              {card.valor}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
