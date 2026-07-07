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

      {/* Grid de Cards */}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/produtos/${p.id}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]"
            >
              {/* Cabeçalho do card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {p.nome}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {p.marca && (
                      <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {p.marca}
                      </span>
                    )}
                    {p.tipo === "USADO" && (
                      <span className="inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Usado
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                      {p.categoria.nome}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Preço</span>
                  <span className="font-bold text-gray-900">
                    {p.precoVenda ? formatCurrency(p.precoVenda) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Estoque</span>
                  <span className={`font-semibold ${
                    p._count.stockItems > 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {p._count.stockItems > 0
                      ? `${p._count.stockItems} un.`
                      : "Sem estoque"}
                  </span>
                </div>
                {p.sku && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">SKU</span>
                    <span className="font-mono text-xs text-gray-400">{p.sku}</span>
                  </div>
                )}
              </div>

              {/* Lucro */}
              {p.precoCusto && p.precoVenda && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Margem</span>
                    <span className={`font-semibold ${
                      (p.precoVenda - p.precoCusto) / p.precoCusto >= 0.2
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}>
                      {formatCurrency(p.precoVenda - p.precoCusto)} (
                      {Math.round(((p.precoVenda - p.precoCusto) / p.precoCusto) * 100)}%)
                    </span>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
