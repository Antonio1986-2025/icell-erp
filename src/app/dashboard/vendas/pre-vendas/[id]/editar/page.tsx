"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import QuickCadastroModal from "@/components/QuickCadastroModal";

export default function EditarPreVendaPage() {
  const params = useParams();
  const router = useRouter();
  const [preVenda, setPreVenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fornecedor, setFornecedor] = useState<any>(null);
  const [fornSearch, setFornSearch] = useState("");
  const [fornResults, setFornResults] = useState<any[]>([]);
  const [fornSearching, setFornSearching] = useState(false);
  const [precoCusto, setPrecoCusto] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalErro, setModalErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/vendas/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPreVenda(data);
        } else {
          setError("Pré-venda não encontrada");
        }
      } catch {
        setError("Erro ao carregar");
      }
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  useEffect(() => {
    if (!fornSearch.trim()) { setFornResults([]); return; }
    const timer = setTimeout(async () => {
      setFornSearching(true);
      try {
        const r = await fetch(`/api/fornecedores?search=${encodeURIComponent(fornSearch.trim())}`);
        if (r.ok) {
          const data = await r.json();
          setFornResults(data.fornecedores || []);
        }
      } catch {}
      setFornSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [fornSearch]);

  async function salvar() {
    if (!fornecedor) { setError("Selecione um fornecedor"); return; }
    if (!precoCusto || parseFloat(precoCusto) <= 0) { setError("Defina o valor de custo"); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/vendas/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorId: fornecedor.id,
          precoCusto,
          prazoEntregaDias: prazoEntrega,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        setSaving(false);
        return;
      }

      router.push("/dashboard/vendas/pre-vendas");
    } catch {
      setError("Erro ao salvar");
      setSaving(false);
    }
  }

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!preVenda) return <p className="mt-8 text-center text-sm text-red-600">Pré-venda não encontrada</p>;

  const tradeIn = preVenda.inspectionReports?.[0];
  const produto = preVenda.items?.[0]?.parent;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/vendas/pre-vendas" className="text-sm text-blue-600 hover:underline">
        ← Voltar para pré-vendas
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">Comprar Produto</h1>
      <p className="mt-1 text-sm text-gray-500">Pré-Venda #{preVenda.numero}</p>

      <div className="mt-6 space-y-6">
        {/* Resumo da Pré-Venda */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm text-amber-800">
            <div><span className="font-medium">Cliente:</span> {preVenda.cliente?.nome || "—"}</div>
            <div><span className="font-medium">CPF:</span> {preVenda.cliente?.cpf || "—"}</div>
            <div><span className="font-medium">Produto:</span> {produto?.nome || "—"}</div>
            <div><span className="font-medium">Valor:</span> {formatCurrency(preVenda.subtotal)}</div>
          </div>
          {tradeIn && (
            <div className="mt-2 rounded-lg bg-amber-100 p-2 text-sm">
              <span className="font-medium">Troca:</span> {tradeIn.aparelhoNome} (-{formatCurrency(tradeIn.valorEstimado || 0)})
            </div>
          )}
        </div>

        {/* Fornecedor */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Fornecedor</h2>
          <div>
            {fornecedor ? (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                <div>
                  <p className="font-medium text-green-900">{fornecedor.nome}</p>
                  {fornecedor.cnpj && <p className="text-xs text-green-600">{fornecedor.cnpj}</p>}
                </div>
                <button
                  onClick={() => { setFornecedor(null); setFornSearch(""); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Buscar fornecedor</label>
                <input
                  type="text"
                  value={fornSearch}
                  onChange={(e) => setFornSearch(e.target.value)}
                  placeholder="Digite nome ou CNPJ..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                {fornSearching && <p className="mt-1 text-xs text-gray-400">Buscando...</p>}
                {fornResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white shadow">
                    {fornResults.map((f: any) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setFornecedor(f); setFornResults([]); setFornSearch(f.nome); }}
                        className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <p className="text-sm font-medium text-gray-900">{f.nome}</p>
                        <div className="text-xs text-gray-500">
                          {f.cnpj && <span>{f.cnpj} | </span>}
                          {f.contato && <span>{f.contato}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {fornSearch.trim() && fornResults.length === 0 && !fornSearching && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">
                      Nenhum fornecedor encontrado para "{fornSearch}".
                    </p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      + Cadastrar novo fornecedor
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custo e Prazo */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Custo e Entrega</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Custo (R$) *</label>
              <input
                type="number"
                value={precoCusto}
                onChange={(e) => setPrecoCusto(e.target.value)}
                placeholder="Quanto você pagou"
                step="0.01"
                min="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus={!!fornecedor}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prazo de Entrega (dias)</label>
              <input
                type="number"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                placeholder="Ex: 10"
                min="1"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">Quantos dias o fornecedor leva pra entregar</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between">
          <Link
            href="/dashboard/vendas/pre-vendas"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            onClick={salvar}
            disabled={saving || !fornecedor || !precoCusto}
            className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "✅ Confirmar Compra"}
          </button>
        </div>
      </div>

      {modalErro && <p className="mt-2 text-sm text-red-600">{modalErro}</p>}

      {showModal && (
        <QuickCadastroModal
          tipo="fornecedor"
          nomeInicial={fornSearch}
          onClose={() => setShowModal(false)}
          onConfirm={async (dados) => {
            setModalErro("");
            try {
              const r = await fetch("/api/fornecedores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  nome: dados.nome,
                  cnpj: dados.cnpj || null,
                  contato: dados.contato || null,
                }),
              });
              if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Erro ao cadastrar"); }
              const created = await r.json();
              setFornecedor(created);
              setFornSearch(created.nome);
              setShowModal(false);
            } catch (e: any) {
              setModalErro(e.message);
            }
          }}
        />
      )}
    </div>
  );
}
