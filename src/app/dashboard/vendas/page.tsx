"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const res = await fetch("/api/vendas?tipo=VENDA&status=CONCLUIDA");
      if (res.ok) setVendas(await res.json());
      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-sm text-gray-500">{vendas.length} venda{vendas.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/vendas/pdv"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nova Venda (PDV)
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>
      ) : vendas.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">Nenhuma venda registrada</p>
      ) : (
        <div className="mt-4 space-y-3">
          {vendas.map((venda) => (
            <Link
              key={venda.id}
              href={`/dashboard/vendas/${venda.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">Venda #{venda.numero}</h3>
                    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {venda.status}
                    </span>
                    {venda.tipo === "TRADE_IN" && (
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Trade-in
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {venda.cliente && <span>Cliente: {venda.cliente.nome} | </span>}
                    {venda.vendedor && <span>Vendedor: {venda.vendedor.nome} | </span>}
                    <span>{formatDateTime(venda.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  {venda.desconto > 0 && (
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(venda.subtotal)}</p>
                  )}
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(venda.total)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
