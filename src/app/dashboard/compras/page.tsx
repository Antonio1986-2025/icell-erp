"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Fornecedor { id: string; nome: string; cnpj?: string | null }
interface PreVenda {
  id: string;
  numero: number;
  status: string;
  observacoes: string | null;
  createdAt: string;
  prazoEntregaDias: number | null;
  custoTotal: number;
  subtotal: number;
  cliente: { nome: string; cpf?: string | null } | null;
  fornecedor: { id: string; nome: string } | null;
  vendedor: { nome: string } | null;
  items: { parent: { nome: string; marca?: string | null; modelo?: string | null } }[];
}

export default function ComprasPage() {
  const router = useRouter();
  const [list, setList] = useState<PreVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fornSearch, setFornSearch] = useState("");
  const [fornResults, setFornResults] = useState<any[]>([]);
  const [fornSelected, setFornSelected] = useState<Fornecedor | null>(null);
  const [custo, setCusto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [showFornSearch, setShowFornSearch] = useState(false);
  const searchTimer = useRef<any>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const r = await fetch("/api/compras?status=PENDENTES");
      if (r.ok) setList(await r.json());
    } catch {}
    setLoading(false);
  }

  function iniciarEdicao(pv: PreVenda) {
    setEditando(pv.id);
    setFornSelected(pv.fornecedor || null);
    setFornSearch(pv.fornecedor?.nome || "");
    setCusto(pv.custoTotal ? pv.custoTotal.toString() : "");
    setPrazo(pv.prazoEntregaDias ? pv.prazoEntregaDias.toString() : "");
    setShowFornSearch(false);
    setFornResults([]);
    setError("");
  }

  function buscarFornecedor(q: string) {
    setFornSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setFornResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/fornecedores?search=${encodeURIComponent(q)}`);
        if (r.ok) {
          const data = await r.json();
          setFornResults(data.fornecedores || []);
          setShowFornSearch(true);
        }
      } catch {}
    }, 300);
  }

  function selecionarFornecedor(f: Fornecedor) {
    setFornSelected(f);
    setFornSearch(f.nome);
    setShowFornSearch(false);
    setFornResults([]);
  }

  async function confirmarCompra() {
    if (!editando) return;
    setSaving(true);
    setError("");

    const body: any = {};
    if (fornSelected?.id) body.fornecedorId = fornSelected.id;
    if (custo) body.custoTotal = parseFloat(custo);
    if (prazo) body.prazoEntregaDias = parseInt(prazo);
    body.status = "COMPRA_REALIZADA";

    try {
      const r = await fetch(`/api/compras/${editando}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const data = await r.json();
        setError(data.error || "Erro ao confirmar compra");
        setSaving(false);
        return;
      }

      setEditando(null);
      await carregar();
    } catch {
      setError("Erro ao confirmar compra");
    }
    setSaving(false);
  }

  const pendentes = list.filter(
    (pv) => pv.status === "PRE_VENDA" || pv.status === "AGUARDANDO_COMPRA"
  );
  const realizadas = list.filter((pv) => pv.status !== "PRE_VENDA" && pv.status !== "AGUARDANDO_COMPRA");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">📦 Compras</h1>
      <p className="mt-1 text-sm text-gray-500">Gerencie as compras de produtos para pré-vendas</p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pendentes */}
      <div className="mt-6">
        <h2 className="text-sm font-bold uppercase text-gray-700">
          Pendentes ({pendentes.length})
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-400">Carregando...</p>
        ) : pendentes.length === 0 ? (
          <div className="mt-4 rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
            Nenhuma pré-venda aguardando compra 🎉
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {pendentes.map((pv) => (
              <div key={pv.id} className="rounded-lg border border-amber-200 bg-white p-4">
                {editando === pv.id ? (
                  /* Formulário de edição */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">
                        #{pv.numero} — {pv.items[0]?.parent?.nome || "Produto"}
                      </p>
                      <button
                        onClick={() => setEditando(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Fornecedor */}
                      <div className="col-span-2 relative">
                        <label className="block text-xs font-medium text-gray-600">Fornecedor</label>
                        <input
                          type="text"
                          value={fornSearch}
                          onChange={(e) => buscarFornecedor(e.target.value)}
                          placeholder="Buscar fornecedor..."
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {showFornSearch && fornResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                            {fornResults.map((f: any) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => selecionarFornecedor(f)}
                                className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                <p className="font-medium text-gray-900">{f.nome}</p>
                                {f.cnpj && <p className="text-xs text-gray-500">{f.cnpj}</p>}
                              </button>
                            ))}
                          </div>
                        )}
                        {fornSelected && (
                          <p className="mt-1 text-xs text-green-600">✓ {fornSelected.nome}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600">Custo (R$)</label>
                        <input
                          type="number"
                          value={custo}
                          onChange={(e) => setCusto(e.target.value)}
                          placeholder="0,00"
                          step="0.01"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600">Prazo (dias)</label>
                        <input
                          type="number"
                          value={prazo}
                          onChange={(e) => setPrazo(e.target.value)}
                          placeholder="Ex: 7"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditando(null)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmarCompra}
                        disabled={saving || !fornSelected}
                        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Salvando..." : "✅ Confirmar Compra"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Visualização */
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          #{pv.numero} — {pv.items[0]?.parent?.nome || "Produto"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Vendedor: {pv.vendedor?.nome || "—"} |{" "}
                          Cliente: {pv.cliente?.nome || "—"} |{" "}
                          Criada em {formatDateTime(pv.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => iniciarEdicao(pv)}
                        className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                      >
                        Comprar
                      </button>
                    </div>
                    {pv.fornecedor && (
                      <p className="mt-1 text-xs text-gray-600">
                        Fornecedor: {pv.fornecedor.nome}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      Venda: {pv.items[0]?.parent?.nome ? formatCurrency(pv.subtotal) : "—"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Realizadas */}
      {realizadas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase text-gray-700">
            Realizadas ({realizadas.length})
          </h2>
          <div className="mt-2 space-y-2">
            {realizadas.map((pv) => (
              <div key={pv.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      #{pv.numero} — {pv.items[0]?.parent?.nome || "Produto"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Status: {pv.status === "COMPRA_REALIZADA" ? "🛒 Compra realizada" : pv.status === "RECEBIDA" ? "📦 Recebido" : pv.status}</span>
                      <span>Fornecedor: {pv.fornecedor?.nome || "—"}</span>
                      {pv.custoTotal > 0 && <span>Custo: {formatCurrency(pv.custoTotal)}</span>}
                      {pv.prazoEntregaDias && <span>Prazo: {pv.prazoEntregaDias} dias</span>}
                      <span>Cliente: {pv.cliente?.nome || "—"}</span>
                    </div>
                  </div>
                  {pv.status === "COMPRA_REALIZADA" && (
                    <Link
                      href={`/dashboard/vendas/pre-vendas/${pv.id}/receber`}
                      className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Receber →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
