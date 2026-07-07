"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Laudo {
  id: string;
  aparelhoNome: string;
  imei: string | null;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  capacidade: string | null;
  valorEstimado: number | null;
  status: string;
  createdAt: string;
  cliente: { nome: string; cpf: string; telefone: string } | null;
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  CONCLUIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default function LaudosPage() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  async function carregar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filtroStatus) params.set("status", filtroStatus);
    const res = await fetch(`/api/laudos?${params}`);
    if (res.ok) setLaudos(await res.json());
    setLoading(false);
  }

  useEffect(() => { carregar() }, [filtroStatus]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laudos de Inspeção</h1>
          <p className="text-sm text-gray-500">{laudos.length} laudo{laudos.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/estoque/laudos/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo Laudo
        </Link>
      </div>

      <div className="mt-4 flex gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por modelo, IMEI, marca..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </form>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="CONCLUIDO">Concluídos</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {laudos.map((laudo) => (
            <Link
              key={laudo.id}
              href={`/dashboard/estoque/laudos/${laudo.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{laudo.aparelhoNome}</h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[laudo.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabels[laudo.status] || laudo.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    {laudo.imei && <span>IMEI: {laudo.imei}</span>}
                    {laudo.marca && <span>{laudo.marca}</span>}
                    {laudo.modelo && <span>{laudo.modelo}</span>}
                    {laudo.cor && <span>{laudo.cor}</span>}
                    {laudo.capacidade && <span>{laudo.capacidade}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                    {laudo.cliente && <span>Cliente: {laudo.cliente.nome}</span>}
                    <span>{formatDateTime(laudo.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  {laudo.valorEstimado && (
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(laudo.valorEstimado)}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {laudos.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-500">
              {search ? "Nenhum laudo encontrado" : "Nenhum laudo cadastrado"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
