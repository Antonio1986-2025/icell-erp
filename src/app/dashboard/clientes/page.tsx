import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getClientes(tenantId: string, search?: string) {
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search } },
      { telefone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  const clientes = await prisma.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { transactions: true } },
    },
  });
  return clientes;
}

export default async function ClientesPage({
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
  const clientes = await getClientes(tenantId, search);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">👥 Clientes</h1>
        <Link
          href="/dashboard/clientes/novo"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
        >
          + Novo Cliente
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
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3.5 text-base shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
        </div>
      </form>

      {/* Grid de Cards */}
      {clientes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-5xl mb-3">👥</p>
          <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
          <Link
            href="/dashboard/clientes/novo"
            className="mt-4 inline-block text-blue-600 font-medium hover:text-blue-700"
          >
            Cadastrar primeiro cliente →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clientes.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/clientes/${c.id}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]"
            >
              {/* Avatar e nome */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-bold text-white shadow-sm">
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {c.nome}
                  </h3>
                  {c.cpf && (
                    <p className="text-xs text-gray-400 font-mono">{c.cpf}</p>
                  )}
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-1.5 text-sm">
                {c.telefone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs">📞</span>
                    <span>{c.telefone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-gray-600 truncate">
                    <span className="text-xs">✉️</span>
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.dataNascimento && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs">🎂</span>
                    <span>{new Date(c.dataNascimento).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Compras</span>
                  <span className="font-semibold text-gray-900">
                    {c._count.transactions} transação{c._count.transactions !== 1 ? "ões" : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
