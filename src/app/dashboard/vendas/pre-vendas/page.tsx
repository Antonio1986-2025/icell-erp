"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function PreVendasPage() {
  const [preVendas, setPreVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const res = await fetch("/api/vendas?status=PRE_VENDA,COMPRA_REALIZADA,RECEBIDA");
    if (res.ok) setPreVendas(await res.json());
    setLoading(false);
  }

  function statusBadge(status: string) {
    switch (status) {
      case "PRE_VENDA":
        return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Aguardando Compra</span>;
      case "COMPRA_REALIZADA":
        return <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Compra Realizada</span>;
      case "RECEBIDA":
        return <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Recebido</span>;
      default:
        return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{status}</span>;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pré-Vendas</h1>
          <p className="text-sm text-gray-500">{preVendas.length} pré-venda{preVendas.length !== 1 ? "s" : ""} ativa{preVendas.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/vendas/pre-vendas/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova Pré-Venda
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>
      ) : preVendas.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">Nenhuma pré-venda ativa</p>
          <Link
            href="/dashboard/vendas/pre-vendas/novo"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Criar primeira pré-venda
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {preVendas.map((pv) => (
            <div
              key={pv.id}
              className={`rounded-lg border p-4 transition hover:shadow-sm ${
                pv.status === "PRE_VENDA"
                  ? "border-amber-200 bg-amber-50"
                  : pv.status === "COMPRA_REALIZADA"
                    ? "border-blue-200 bg-blue-50"
                    : "border-green-200 bg-green-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium ${pv.status === "PRE_VENDA" ? "text-amber-900" : pv.status === "COMPRA_REALIZADA" ? "text-blue-900" : "text-green-900"}`}>
                      Pré-Venda #{pv.numero}
                    </h3>
                    {statusBadge(pv.status)}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {pv.cliente && <span>Cliente: {pv.cliente.nome} | </span>}
                    {pv.fornecedor && <span>Fornecedor: {pv.fornecedor.nome} | </span>}
                    <span>Criada em {formatDateTime(pv.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Produto: {pv.items?.[0]?.parent?.nome || "—"}
                    {pv.inspectionReports?.[0] && ` | Troca: ${pv.inspectionReports[0].aparelhoNome}`}
                  </div>

                  {/* Ações por status */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pv.status === "PRE_VENDA" && (
                      <Link
                        href={`/dashboard/vendas/pre-vendas/${pv.id}/editar`}
                        className="inline-block rounded-md bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        ✏️ Comprar Produto
                      </Link>
                    )}
                    {pv.status === "COMPRA_REALIZADA" && (
                      <Link
                        href={`/dashboard/vendas/pre-vendas/${pv.id}/receber`}
                        className="inline-block rounded-md bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        📦 Receber Produto
                      </Link>
                    )}
                    {pv.status === "RECEBIDA" && (
                      <Link
                        href={`/dashboard/vendas/pdv`}
                        className="inline-block rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700"
                      >
                        🛒 Finalizar no PDV
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="text-sm font-semibold text-gray-700">Total: {formatCurrency(pv.subtotal)}</p>
                  {pv.inspectionReports?.[0] && (
                    <p className="text-xs text-blue-600">Troca: -{formatCurrency(pv.inspectionReports[0].valorEstimado || 0)}</p>
                  )}
                  {pv.status !== "RECEBIDA" && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Cancelar pré-venda #${pv.numero}?`)) return;
                        try {
                          const res = await fetch(`/api/vendas/${pv.id}/finalizar`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "CANCELADO" }),
                          });
                          if (res.ok) {
                            setPreVendas((prev) => prev.filter((v: any) => v.id !== pv.id));
                          } else {
                            const data = await res.json();
                            alert(data.error || "Erro ao cancelar");
                          }
                        } catch {
                          alert("Erro ao cancelar pré-venda");
                        }
                      }}
                      className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      Cancelar
                    </button>
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
