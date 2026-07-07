import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

async function getClientes(tenantId: string, search: string, page: number) {
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { cpf: { contains: search } },
      { telefone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const limit = 20;
  const [clientes, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { nome: "asc" },
    }),
    prisma.client.count({ where }),
  ]);

  return { clientes, total, totalPages: Math.ceil(total / limit) };
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return <p>Não autenticado</p>;

  const tenantId = (session.user as any).tenantId;
  const sp = await searchParams;
  const search = sp.search || "";
  const page = parseInt(sp.page || "1");

  const { clientes, total, totalPages } = await getClientes(tenantId, search, page);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Clientes</h1>
          <p className="text-sm text-gray-500">{total} resultado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/clientes/novo"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all md:py-2.5"
        >
          + Novo Cliente
        </Link>
      </div>

      {/* Busca */}
      <div className="mt-4">
        <form method="GET">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="🔍 Buscar por nome, CPF, telefone ou email..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm"
          />
        </form>
      </div>

      {/* Tabela responsiva */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-[450px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 hidden md:table-header-group">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hidden sm:table-cell">CPF</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Telefone</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Última Compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 block md:table-row p-4 md:p-0 border-b md:border-b-0">
                {/* Nome */}
                <td className="px-4 py-3 block md:table-cell">
                  <Link href={`/dashboard/clientes/${c.id}`} className="block">
                    <p className="text-sm font-medium text-gray-900 hover:text-blue-600">{c.nome}</p>
                    <div className="flex flex-wrap gap-2 mt-1 md:hidden">
                      {c.cpf && <span className="text-xs text-gray-500">CPF: {c.cpf}</span>}
                      {c.email && <span className="text-xs text-gray-500">{c.email}</span>}
                    </div>
                  </Link>
                </td>
                {/* CPF - escondido no mobile */}
                <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">{c.cpf || "--"}</td>
                {/* Telefone */}
                <td className="px-4 py-3 text-sm text-gray-700 block md:table-cell">
                  <span className="md:hidden text-xs text-gray-400">Tel: </span>
                  {c.telefone || "--"}
                </td>
                {/* Email - escondido no mobile */}
                <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{c.email || "--"}</td>
                {/* Total Compras */}
                <td className="px-4 py-3 text-right text-sm text-gray-900 block md:table-cell">
                  <span className="md:hidden text-xs text-gray-400">Total: </span>
                  {c.totalCompras > 0 ? formatCurrency(c.totalCompras) : "R$ 0,00"}
                </td>
                {/* Última Compra */}
                <td className="px-4 py-3 text-sm text-gray-500 block md:table-cell">
                  <span className="md:hidden text-xs text-gray-400">Última compra: </span>
                  {c.ultimaCompra ? formatDate(c.ultimaCompra) : "--"}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  {search ? "❌ Nenhum resultado encontrado" : "👥 Nenhum cliente cadastrado"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dashboard/clientes?page=${p}${search ? `&search=${search}` : ""}`}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? "bg-blue-600 text-white shadow-md"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
