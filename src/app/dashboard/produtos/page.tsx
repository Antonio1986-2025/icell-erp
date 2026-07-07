import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getProdutos(tenantId: string, search: string, page: number) {
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search } },
      { sku: { contains: search } },
      { marca: { contains: search } },
      { modelo: { contains: search } },
    ];
  }

  const limit = 20;
  const [produtos, total] = await Promise.all([
    prisma.productParent.findMany({
      where,
      include: {
        categoria: true,
        stockItems: {
          where: { status: "EM_ESTOQUE" },
          select: { id: true, imei: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.productParent.count({ where }),
  ]);

  return { produtos, total, totalPages: Math.ceil(total / limit) };
}

export default async function ProdutosPage({
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

  const { produtos, total, totalPages } = await getProdutos(tenantId, search, page);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Produtos</h1>
          <p className="text-sm text-gray-500">{total} resultado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/produtos/novo"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all md:py-2.5"
        >
          + Novo Produto
        </Link>
      </div>

      {/* Busca */}
      <div className="mt-4">
        <form method="GET">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="🔍 Buscar por nome, marca, modelo ou SKU..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm"
          />
        </form>
      </div>

      {/* Tabela responsiva */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-[500px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 hidden md:table-header-group">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hidden sm:table-cell">Marca</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hidden md:table-cell">Categoria</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Preço</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {produtos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 block md:table-row p-4 md:p-0 border-b md:border-b-0">
                {/* Nome do produto - sempre visível */}
                <td className="px-4 py-3 block md:table-cell">
                  <Link href={`/dashboard/estoque?search=${p.nome}`} className="block">
                    <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                    <div className="flex flex-wrap gap-2 mt-1 md:hidden">
                      {p.marca && <span className="text-xs text-gray-500">{p.marca}</span>}
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.tipo === "USADO"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {p.tipo === "USADO" ? "Usado" : "Novo"}
                      </span>
                      <span className="text-xs text-gray-400">{p.categoria.nome}</span>
                    </div>
                    {p.modelo && <p className="text-xs text-gray-400 mt-0.5">Modelo: {p.modelo}</p>}
                  </Link>
                </td>
                {/* Marca - escondido no mobile */}
                <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">{p.marca || "--"}</td>
                {/* Tipo - escondido no mobile (mostrado no card) */}
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.tipo === "USADO"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {p.tipo === "USADO" ? "Usado" : "Novo"}
                  </span>
                </td>
                {/* Categoria - escondido no mobile */}
                <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{p.categoria.nome}</td>
                {/* Preço */}
                <td className="px-4 py-3 text-right text-sm text-gray-900 block md:table-cell">
                  <span className="md:hidden text-xs text-gray-400">Preço: </span>
                  {p.precoVenda ? formatCurrency(p.precoVenda) : "--"}
                </td>
                {/* Estoque */}
                <td className="px-4 py-3 text-center text-sm text-gray-500 block md:table-cell">
                  <span className="md:hidden text-xs text-gray-400">Estoque: </span>
                  {p.stockItems.length}
                </td>
              </tr>
            ))}
            {produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  {search ? "❌ Nenhum resultado encontrado" : "📱 Nenhum produto cadastrado"}
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
              href={`/dashboard/produtos?page=${p}${search ? `&search=${search}` : ""}`}
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
