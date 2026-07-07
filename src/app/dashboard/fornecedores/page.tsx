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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-sm text-gray-500">{fornecedores.length} fornecedor{fornecedores.length !== 1 ? "es" : ""}</p>
        </div>
        <Link
          href="/dashboard/fornecedores/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo Fornecedor
        </Link>
      </div>

      <div className="mt-4">
        <form onSubmit={buscar} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou contato..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Buscar
          </button>
        </form>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>
      ) : fornecedores.length === 0 ? (
        <div className="mt-8 rounded-lg bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-500">Nenhum fornecedor cadastrado</p>
          <Link
            href="/dashboard/fornecedores/novo"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            + Cadastrar primeiro fornecedor
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {fornecedores.map((f) => (
            <Link
              key={f.id}
              href={`/dashboard/fornecedores/${f.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{f.nome}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {f.contato && <span>Contato: {f.contato}</span>}
                    {f.cnpj && <span>CNPJ: {f.cnpj}</span>}
                    {f.telefone && <span>Tel: {f.telefone}</span>}
                    {f.email && <span>Email: {f.email}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {f.prazoMedio && (
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {f.prazoMedio} dias
                    </span>
                  )}
                  <p className="mt-1 text-xs text-blue-600">Ver →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
