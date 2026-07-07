"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  EM_ESTOQUE: "Em Estoque",
  VENDIDO: "Vendido",
  RESERVADO: "Reservado",
};

const statusColors: Record<string, string> = {
  EM_ESTOQUE: "bg-green-100 text-green-700",
  VENDIDO: "bg-blue-100 text-blue-700",
  RESERVADO: "bg-yellow-100 text-yellow-700",
};

export default function EstoquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [acessorios, setAcessorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  async function carregar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFiltro) params.set("status", statusFiltro);
    if (tipoFiltro) params.set("tipo", tipoFiltro);
    const res = await fetch(`/api/estoque?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.stockItems || []);
      setAcessorios(data.accessories || []);
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [statusFiltro, tipoFiltro]);

  function buscar() { carregar(); }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
        <p className="text-sm text-gray-500">Gerencie todos os itens do estoque</p>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-300 p-0.5">
          {["", "celular", "acessorio"].map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tipoFiltro === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t === "" ? "Todos" : t === "celular" ? "Celulares" : "Acessórios"}
            </button>
          ))}
        </div>

        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="EM_ESTOQUE">Em Estoque</option>
          <option value="VENDIDO">Vendido</option>
          <option value="RESERVADO">Reservado</option>
        </select>

        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Buscar por IMEI, nome, modelo..."
            className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={buscar}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Buscar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500">Carregando...</p>
      ) : (
        <>
          {/* Celulares */}
          {(!tipoFiltro || tipoFiltro === "celular") && items.length > 0 && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-bold uppercase text-gray-700">
                  Celulares {tipoFiltro !== "celular" && `(${items.length})`}
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/estoque/${item.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {item.parent?.nome || "Produto"}
                        </p>
                        {item.cor && <span className="text-xs text-gray-400">({item.cor})</span>}
                        {item.capacidade && <span className="text-xs text-gray-400">{item.capacidade}</span>}
                      </div>
                      {item.imei && (
                        <p className="text-xs font-mono text-gray-500">IMEI: {item.imei}</p>
                      )}
                      {item.parent?.categoria?.nome && (
                        <p className="text-xs text-gray-400">{item.parent.categoria.nome}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabels[item.status] || item.status}
                      </span>
                      {item.precoCusto && (
                        <span className="text-xs text-gray-500">{formatCurrency(item.precoCusto)}</span>
                      )}
                      <span className="text-xs text-blue-600">Ver →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Acessórios (agregado por produto) */}
          {(!tipoFiltro || tipoFiltro === "acessorio") && acessorios.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-bold uppercase text-gray-700">
                  Acessórios {tipoFiltro !== "acessorio" && `(${acessorios.length})`}
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {acessorios.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{prod.nome}</p>
                      <p className="text-xs text-gray-400">
                        {prod.marca && `${prod.marca} `}{prod.modelo || ""} | {prod.categoria?.nome || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        prod._count?.stockItems > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {prod._count?.stockItems || 0} em estoque
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && acessorios.length === 0 && (
            <p className="text-center text-sm text-gray-400">Nenhum item encontrado.</p>
          )}
        </>
      )}
    </div>
  );
}
