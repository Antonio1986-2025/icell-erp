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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">{total} resultado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/produtos/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Criar Produto
        </Link>
      </div>

      <div className="mt-4">
        <form method="GET">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Buscar por nome, marca, modelo ou SKU..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Marca</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Preço</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Estoque</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">IMEI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {produtos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  {p.modelo && <p className="text-xs text-gray-400">Modelo: {p.modelo}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.marca || "--"}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.tipo === "USADO"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {p.tipo === "USADO" ? "Usado" : "Novo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.categoria.nome}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {p.precoVenda ? formatCurrency(p.precoVenda) : "--"}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">{p.stockItems.length}</td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {p.stockItems.length === 0 ? "--" : p.stockItems.length === 1 ? p.stockItems[0].imei || "--" : `Vários (${p.stockItems.length})`}
                </td>
              </tr>
            ))}
            {produtos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  {search ? "Nenhum resultado encontrado" : "Nenhum produto cadastrado"}
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
              href={`/dashboard/produtos?page=${p}${search ? `&search=${search}` : ""}`}
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
