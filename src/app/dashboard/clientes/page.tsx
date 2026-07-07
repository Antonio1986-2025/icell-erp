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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{total} resultado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/clientes/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo Cliente
        </Link>
      </div>

      <div className="mt-4">
        <form method="GET">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Buscar por nome, CPF, telefone ou email..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">CPF</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Telefone</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total Compras</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Última Compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/clientes/${c.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.cpf || "--"}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.telefone || "--"}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.email || "--"}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {c.totalCompras > 0 ? formatCurrency(c.totalCompras) : "--"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {c.ultimaCompra ? formatDate(c.ultimaCompra) : "--"}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  {search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dashboard/clientes?page=${p}${search ? `&search=${search}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
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
