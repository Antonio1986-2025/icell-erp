"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Compra {
  id: string;
  numero: number;
  tipo: string;
  status: string;
  observacoes: string | null;
  createdAt: string;
  prazoEntregaDias: number | null;
  custoTotal: number;
  subtotal: number;
  desconto: number;
  total: number;
  cliente: { nome: string; cpf?: string | null } | null;
  fornecedor: { id: string; nome: string } | null;
  criador: { nome: string } | null;
  items: { parent: { nome: string; marca?: string | null; modelo?: string | null }; stockItem?: { imei?: string | null; status?: string } | null }[];
}

export default function ComprasPage() {
  const [list, setList] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"todas" | "estoque" | "pre_venda">("todas");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const r = await fetch("/api/compras");
      if (r.ok) setList(await r.json());
    } catch {}
    setLoading(false);
  }

  async function confirmarRecebimento(id: string) {
    if (!confirm("Confirmar recebimento dos produtos?")) return;
    try {
      const r = await fetch(`/api/compras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECEBIDA" }),
      });
      if (r.ok) await carregar();
    } catch {}
  }

  const comprasEstoque = list.filter((c) => c.tipo === "COMPRA");
  const comprasPreVenda = list.filter((c) => c.tipo === "VENDA" && (c.status === "PRE_VENDA" || c.status === "AGUARDANDO_COMPRA" || c.status === "COMPRA_REALIZADA"));
  const comprasRealizadas = list.filter((c) => c.status === "COMPRA_REALIZADA" || c.status === "RECEBIDA");
  const comprasParaReceber = list.filter((c) => c.status === "COMPRA_REALIZADA");

  function getStatusBadge(status: string) {
    const map: Record<string, string> = {
      "PRE_VENDA": "bg-yellow-100 text-yellow-800",
      "AGUARDANDO_COMPRA": "bg-orange-100 text-orange-800",
      "COMPRA_REALIZADA": "bg-blue-100 text-blue-800",
      "RECEBIDA": "bg-green-100 text-green-800",
      "CONCLUIDA": "bg-green-100 text-green-800",
      "CANCELADA": "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  }

  function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      "PRE_VENDA": "⏳ Pré-venda",
      "AGUARDANDO_COMPRA": "🛒 Aguardando compra",
      "COMPRA_REALIZADA": "📦 Compra realizada",
      "RECEBIDA": "✅ Recebido",
      "CONCLUIDA": "✅ Concluída",
      "CANCELADA": "❌ Cancelada",
    };
    return map[status] || status;
  }

  const displayed = aba === "estoque" ? comprasEstoque : aba === "pre_venda" ? comprasPreVenda : list;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Compras</h1>
          <p className="mt-1 text-sm text-gray-500">
            {comprasEstoque.length} compras diretas · {comprasPreVenda.length} pré-vendas
            {comprasParaReceber.length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">· {comprasParaReceber.length} aguardando recebimento</span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/compras/nova"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
        >
          + Nova Compra
        </Link>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 rounded-xl bg-gray-100 p-1">
        {[
          { key: "todas", label: `Todas (${list.length})` },
          { key: "estoque", label: `📦 Diretas (${comprasEstoque.length})` },
          { key: "pre_venda", label: `📋 Pré-Vendas (${comprasPreVenda.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key as any)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              aba === tab.key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center">
          <p className="text-gray-400">Carregando...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-5xl mb-3">📦</p>
          <p className="text-gray-500 text-lg mb-4">
            {aba === "estoque" ? "Nenhuma compra direta encontrada" : "Nenhuma compra encontrada"}
          </p>
          <Link
            href="/dashboard/compras/nova"
            className="inline-block text-blue-600 font-medium hover:text-blue-700"
          >
            Criar primeira compra →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.slice().reverse().map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">
                      #{c.numero}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      {c.tipo === "COMPRA" ? "🛒 Compra Direta" : "📋 Pré-Venda"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-800 truncate">
                    {c.items[0]?.parent?.nome || "Produto"}
                    {c.items.length > 1 && ` +${c.items.length - 1} outros`}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {c.fornecedor && <span>🏭 {c.fornecedor.nome}</span>}
                    {c.cliente && <span>👤 {c.cliente.nome}</span>}
                    <span>📅 {formatDateTime(c.createdAt)}</span>
                    {c.custoTotal > 0 && <span>💰 Custo: {formatCurrency(c.custoTotal)}</span>}
                    {c.total > 0 && !c.custoTotal && <span>💰 Total: {formatCurrency(c.total)}</span>}
                    {c.prazoEntregaDias && <span>📅 Prazo: {c.prazoEntregaDias}d</span>}
                    {c.criador && <span>👤 Criado por: {c.criador.nome}</span>}
                  </div>

                  {/* Itens com IMEI */}
                  {c.items.filter(i => i.stockItem?.imei).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.items.filter(i => i.stockItem?.imei).slice(0, 5).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                          📱 {item.stockItem?.imei}
                        </span>
                      ))}
                      {c.items.filter(i => i.stockItem?.imei).length > 5 && (
                        <span className="text-xs text-gray-400">+{c.items.filter(i => i.stockItem?.imei).length - 5}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {c.status === "COMPRA_REALIZADA" && (
                    <button
                      onClick={() => confirmarRecebimento(c.id)}
                      className="rounded-xl bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 transition-all active:scale-95"
                    >
                      ✅ Receber
                    </button>
                  )}
                  {c.tipo === "COMPRA" && c.status === "CONCLUIDA" && (
                    <Link
                      href={`/dashboard/compras/${c.id}`}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Detalhes
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
