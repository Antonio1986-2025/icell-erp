"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoCelularPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    imei: "",
    nome: "",
    marca: "",
    modelo: "",
    cor: "",
    capacidade: "",
    condicao: "NOVO",
    precoCusto: "",
    precoVenda: "",
    nivelBateria: "",
    dataFimGarantia: "",
    observacoes: "",
  });

  function update(changes: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...changes }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.imei.trim()) {
      setError("IMEI é obrigatório");
      return;
    }
    if (!form.nome.trim()) {
      setError("Nome do aparelho é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/celulares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao cadastrar");
        return;
      }
      router.push("/dashboard/estoque");
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard/estoque" className="text-sm text-blue-600 hover:text-blue-800">
            ← Voltar para estoque
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">📱 Novo Celular</h1>
          <p className="text-sm text-gray-500">Cadastre um celular diretamente pelo IMEI</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>
        )}

        {/* IMEI — destaque */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            IMEI <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.imei}
            onChange={(e) => update({ imei: e.target.value })}
            placeholder="Digite ou escaneie o IMEI..."
            className="mt-1 w-full rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-3 font-mono tracking-wider text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => update({ nome: e.target.value })}
              placeholder="Ex: iPhone 13"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Marca</label>
            <input
              type="text"
              value={form.marca}
              onChange={(e) => update({ marca: e.target.value })}
              placeholder="Ex: Apple"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Modelo</label>
            <input
              type="text"
              value={form.modelo}
              onChange={(e) => update({ modelo: e.target.value })}
              placeholder="Ex: A2634"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cor</label>
            <input
              type="text"
              value={form.cor}
              onChange={(e) => update({ cor: e.target.value })}
              placeholder="Ex: Preto"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Capacidade</label>
            <input
              type="text"
              value={form.capacidade}
              onChange={(e) => update({ capacidade: e.target.value })}
              placeholder="Ex: 128GB"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Preços */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Preço de Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              value={form.precoCusto}
              onChange={(e) => update({ precoCusto: e.target.value })}
              placeholder="0,00"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Preço de Venda (R$) <span className="text-xs text-gray-400">(editável depois)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={form.precoVenda}
              onChange={(e) => update({ precoVenda: e.target.value })}
              placeholder="0,00"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Condição e Bateria */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Condição</label>
            <select
              value={form.condicao}
              onChange={(e) => update({ condicao: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="NOVO">🆕 Novo</option>
              <option value="COMO_NOVO">Como Novo</option>
              <option value="BOM">👍 Bom</option>
              <option value="REGULAR">👌 Regular</option>
              <option value="RUIM">⚠️ Ruim</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bateria (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.nivelBateria}
              onChange={(e) => update({ nivelBateria: e.target.value })}
              placeholder="85"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Garantia */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Garantia até</label>
          <input
            type="date"
            value={form.dataFimGarantia}
            onChange={(e) => update({ dataFimGarantia: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={(e) => update({ observacoes: e.target.value })}
            placeholder="Arranhão na tela, sem carregador..."
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? "💾 Salvando..." : "💾 Cadastrar Celular"}
          </button>
          <Link
            href="/dashboard/estoque"
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
