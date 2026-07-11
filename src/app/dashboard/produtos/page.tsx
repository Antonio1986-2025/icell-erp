import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getProdutos(tenantId: string, search?: string) {
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { marca: { contains: search, mode: "insensitive" } },
      {
        stockItems: {
          some: { imei: { contains: search, mode: "insensitive" } },
        },
      },
    ];
  }
  const produtos = await prisma.productParent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      categoria: true,
      _count: { select: { stockItems: true } },
      stockItems: {
        where: { status: "EM_ESTOQUE" },
        select: { id: true, cor: true, capacidade: true, condicao: true, precoVenda: true },
        take: 3,
      },
    },
  });
  return produtos;
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    return <p className="p-6 text-gray-500">Acesso não autorizado</p>;
  }
  const tenantId = (session.user as any).tenantId;
  const { search } = await searchParams;
  const produtos = await getProdutos(tenantId, search);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">📱 Produtos</h1>
        <Link
          href="/dashboard/produtos/novo"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
        >
          + Novo Produto
        </Link>
      </div>

      {/* Busca */}
      <form className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Buscar por nome, SKU ou IMEI..."
            className="w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3.5 text-base shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
        </div>
      </form>

      {/* Lista */}
      {produtos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-5xl mb-3">📱</p>
          <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
          <Link
            href="/dashboard/produtos/novo"
            className="mt-4 inline-block text-blue-600 font-medium hover:text-blue-700"
          >
            Cadastrar primeiro produto →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Produto</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Categoria</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Preço</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Estoque</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Margem</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {produtos.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/produtos/${p.id}`} className="block">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{p.nome}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {p.marca && (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {p.marca}
                          </span>
                        )}
                        {p.modelo && (
                          <span className="text-xs text-gray-400 font-mono">{p.modelo}</span>
                        )}
                        {p.tipo === "USADO" && (
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Usado
                          </span>
                        )}
                        {p.stockItems.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {p.stockItems.map(s => [s.cor, s.capacidade].filter(Boolean).join(" ")).join(", ")}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                      {p.categoria.nome}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="font-semibold text-gray-900">
                      {p.precoVenda ? formatCurrency(p.precoVenda) : "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 font-semibold text-sm ${
                      p._count.stockItems > 0 ? "text-green-600" : "text-red-400"
                    }`}>
                      {p._count.stockItems > 0 ? (
                        <>
                          <span className="text-xs">📦</span>
                          {p._count.stockItems} un.
                        </>
                      ) : (
                        "0"
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {p.precoCusto && p.precoVenda ? (
                      <span className={`font-semibold text-sm ${
                        (p.precoVenda - p.precoCusto) / p.precoCusto >= 0.2
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}>
                        {formatCurrency(p.precoVenda - p.precoCusto)} ({Math.round(((p.precoVenda - p.precoCusto) / p.precoCusto) * 100)}%)
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/produtos/${p.id}`}
                      className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 text-sm font-medium transition-opacity"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
