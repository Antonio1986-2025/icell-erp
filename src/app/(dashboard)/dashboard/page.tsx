import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, startOfMonth, endOfMonth } from "date-fns";

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Bem-vindo ao iCell ERP</p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Vendas Hoje</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(vendasHoje._sum.total || 0)}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Produtos em Estoque</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">{estoqueCount}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Clientes Cadastrados</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">{clientesCount}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Lucro do Mês</h2>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(lucroMes._sum.lucro || 0)}</p>
        </div>
      </div>
    </div>
  );
}
