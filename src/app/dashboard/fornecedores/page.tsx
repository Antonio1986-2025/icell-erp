"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fornecedor {
  id: string;
  nome: string;
  contato: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  prazoMedio: number | null;
  _count?: { stockItems: number; transactions: number };
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function carregar(q?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    const res = await fetch(`/api/fornecedores?${params}`);
    if (res.ok) {
      const data = await res.json();
      setFornecedores(data.fornecedores || []);
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    carregar(search);
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">🏭 Fornecedores</h1>
        <Link
          href="/dashboard/fornecedores/novo"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
        >
          + Novo Fornecedor
        </Link>
      </div>

      {/* Busca */}
      <form onSubmit={buscar} className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou contato..."
            className="w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-24 py-3.5 text-base shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all"
          >
            Buscar
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      ) : fornecedores.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-5xl mb-3">🏭</p>
          <p className="text-gray-500 text-lg">Nenhum fornecedor cadastrado</p>
          <Link
            href="/dashboard/fornecedores/novo"
            className="mt-4 inline-block text-blue-600 font-medium hover:text-blue-700"
          >
            Cadastrar primeiro fornecedor →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fornecedores.map((f) => (
            <Link
              key={f.id}
              href={`/dashboard/fornecedores/${f.id}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]"
            >
              {/* Nome */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 text-white font-bold text-lg shadow-sm">
                    {f.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {f.nome}
                    </h3>
                    {f.contato && (
                      <p className="text-xs text-gray-400">{f.contato}</p>
                    )}
                  </div>
                </div>
                {f.prazoMedio && (
                  <span className="shrink-0 inline-flex items-center rounded-xl bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {f.prazoMedio}d
                  </span>
                )}
              </div>

              {/* Detalhes */}
              <div className="space-y-1.5 text-sm">
                {f.cnpj && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs">📋</span>
                    <span className="font-mono text-xs">{f.cnpj}</span>
                  </div>
                )}
                {f.telefone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs">📞</span>
                    <span>{f.telefone}</span>
                  </div>
                )}
                {f.email && (
                  <div className="flex items-center gap-2 text-gray-600 truncate">
                    <span className="text-xs">✉️</span>
                    <span className="truncate">{f.email}</span>
                  </div>
                )}
              </div>

              {/* Resumo */}
              {f._count && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{f._count.stockItems || 0} produto{(f._count.stockItems || 0) !== 1 ? "s" : ""}</span>
                    <span>{f._count.transactions || 0} compra{(f._count.transactions || 0) !== 1 ? "s" : ""}</span>
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
