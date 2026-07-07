"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nome: "",
    contato: "",
    cnpj: "",
    telefone: "",
    email: "",
    prazoMedio: "",
    observacoes: "",
  });

  function updateForm(updates: Partial<typeof form>) {
    setForm({ ...form, ...updates });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contato: form.contato || null,
          cnpj: form.cnpj || null,
          telefone: form.telefone || null,
          email: form.email || null,
          prazoMedio: form.prazoMedio || null,
          observacoes: form.observacoes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar fornecedor");
        setLoading(false);
        return;
      }

      router.push("/dashboard/fornecedores");
    } catch {
      setError("Erro ao criar fornecedor");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/fornecedores" className="text-sm text-blue-600 hover:underline">
          Fornecedores
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Novo Fornecedor</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dados do Fornecedor</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nome / Razão Social *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => updateForm({ nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
                placeholder="Nome da empresa ou pessoa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">CNPJ / CPF</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => updateForm({ cnpj: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contato</label>
              <input
                type="text"
                value={form.contato}
                onChange={(e) => updateForm({ contato: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Nome do responsável"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => updateForm({ telefone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm({ email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prazo Médio (dias)</label>
              <input
                type="number"
                value={form.prazoMedio}
                onChange={(e) => updateForm({ prazoMedio: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Ex: 30"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => updateForm({ observacoes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Condições especiais, produtos que fornece, etc."
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
          <Link
            href="/dashboard/fornecedores"
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
