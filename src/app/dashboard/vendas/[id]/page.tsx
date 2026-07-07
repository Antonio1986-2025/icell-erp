"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface VendaDetalhe {
  id: string;
  numero: number;
  tipo: string;
  total: number;
  subtotal: number;
  desconto: number;
  custoTotal: number;
  lucro: number;
  status: string;
  observacoes: string | null;
  createdAt: string;
  cliente: { id: string; nome: string; cpf: string | null; telefone: string | null } | null;
  fornecedor: { nome: string } | null;
  vendedor: { nome: string } | null;
  items: {
    id: string;
    tipo: string;
    quantidade: number;
    precoUnit: number;
    subtotal: number;
    stockItemId: string | null;
    stockItem: { id: string; imei: string | null; cor: string | null; capacidade: string | null; condicao: string | null } | null;
    parent: { nome: string } | null;
  }[];
  inspectionReports: { id: string; aparelhoNome: string; valorEstimado: number | null }[];
  payments: { id: string; metodo: string; valor: number; parcelas: number }[];
}

export default function VendaDetalhePage() {
  const params = useParams();
  const [venda, setVenda] = useState<VendaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const res = await fetch(`/api/vendas`);
      if (res.ok) {
        const data = await res.json();
        const encontrada = data.find((v: any) => v.id === params.id);
        setVenda(encontrada || null);
      }
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!venda) return <p className="mt-8 text-center text-sm text-red-600">Venda não encontrada</p>;

  const saidaItems = venda.items.filter((i) => i.tipo === "SAIDA");
  const entradaItems = venda.items.filter((i) => i.tipo === "ENTRADA");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/vendas" className="text-sm text-blue-600 hover:underline">
        ← Voltar para vendas
      </Link>

      <div className="mt-4 space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Venda #{venda.numero}</h1>
                {venda.tipo === "TRADE_IN" && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    Trade-in
                  </span>
                )}
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  {venda.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{formatDateTime(venda.createdAt)}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(venda.total)}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {venda.cliente && (
              <>
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{venda.cliente.nome}</span></div>
                <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{venda.cliente.cpf || "—"}</span></div>
              </>
            )}
            {venda.vendedor && <div><span className="text-gray-500">Vendedor:</span> <span className="font-medium">{venda.vendedor.nome}</span></div>}
            {venda.fornecedor && <div><span className="text-gray-500">Fornecedor:</span> <span className="font-medium">{venda.fornecedor.nome}</span></div>}
            {venda.desconto > 0 && <div><span className="text-gray-500">Desconto:</span> <span className="font-medium text-red-600">- {formatCurrency(venda.desconto)}</span></div>}
            {venda.custoTotal > 0 && <div><span className="text-gray-500">Custo total:</span> <span className="font-medium">{formatCurrency(venda.custoTotal)}</span></div>}
            {venda.lucro !== 0 && <div><span className="text-gray-500">Lucro:</span> <span className={`font-medium ${venda.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(venda.lucro)}</span></div>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Itens Vendidos</h2>
          <div className="space-y-2">
            {saidaItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.stockItem ? `${item.parent?.nome || ""} ${item.stockItem.cor ? `(${item.stockItem.cor})` : ""}` : item.parent?.nome || "Produto"}
                  </p>
                  {item.stockItem?.imei && <p className="text-xs text-gray-400">IMEI: {item.stockItem.imei}</p>}
                  {item.quantidade > 1 && <p className="text-xs text-gray-400">Qtd: {item.quantidade}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
                  {item.stockItem?.id && (
                    <Link href={`/dashboard/estoque/${item.stockItem.id}`} className="text-xs text-blue-600 hover:underline">
                      Detalhes →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {entradaItems.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-blue-700">Trade-in / Entrada</h2>
            <div className="space-y-2">
              {entradaItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.stockItem ? `/dashboard/estoque/${item.stockItem.id}` : "#"}
                  className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2 hover:bg-blue-50"
                >
                  <div>
                    <p className="text-sm font-medium text-blue-900">{item.parent?.nome || "Aparelho"}</p>
                    {item.stockItem?.imei && <p className="text-xs text-blue-600">IMEI: {item.stockItem.imei}</p>}
                    <p className="text-xs text-blue-400">Ver detalhes →</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(Math.abs(item.subtotal))}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {venda.inspectionReports.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Laudo Vinculado</h2>
            {venda.inspectionReports.map((laudo) => (
              <Link
                key={laudo.id}
                href={`/dashboard/estoque/laudos/${laudo.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{laudo.aparelhoNome}</p>
                  <p className="text-xs text-gray-400">Ver laudo completo</p>
                </div>
                {laudo.valorEstimado && <p className="text-sm font-semibold text-green-600">{formatCurrency(laudo.valorEstimado)}</p>}
              </Link>
            ))}
          </div>
        )}

        {venda.payments?.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Pagamentos</h2>
            <div className="space-y-2">
              {venda.payments.map((pag) => (
                <div key={pag.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <span className="text-sm font-medium text-gray-900">{pag.metodo}{pag.parcelas > 1 ? ` (${pag.parcelas}x)` : ""}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(pag.valor)}</span>
                </div>
              ))}
              <hr />
              <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                <span>Total Pago</span>
                <span>{formatCurrency(venda.payments.reduce((s, p) => s + p.valor, 0))}</span>
              </div>
            </div>
          </div>
        )}

        {venda.observacoes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-medium text-amber-800">Observações</h3>
            <p className="mt-1 text-sm text-amber-700">{venda.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
