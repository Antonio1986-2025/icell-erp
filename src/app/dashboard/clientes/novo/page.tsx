"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    rg: "",
    telefone: "",
    email: "",
    endereco: "",
    dataNascimento: "",
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
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cpf: form.cpf || null,
          rg: form.rg || null,
          telefone: form.telefone || null,
          email: form.email || null,
          endereco: form.endereco || null,
          dataNascimento: form.dataNascimento || null,
          observacoes: form.observacoes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar cliente");
        setLoading(false);
        return;
      }

      router.push("/dashboard/clientes");
    } catch {
      setError("Erro ao criar cliente");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clientes" className="text-sm text-blue-600 hover:underline">
          Clientes
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dados Pessoais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => updateForm({ nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
                placeholder="Nome completo do cliente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">CPF</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => updateForm({ cpf: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">RG</label>
              <input
                type="text"
                value={form.rg}
                onChange={(e) => updateForm({ rg: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
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
              <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
              <input
                type="date"
                value={form.dataNascimento}
                onChange={(e) => updateForm({ dataNascimento: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Endereço</label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => updateForm({ endereco: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => updateForm({ observacoes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Preferências, restrições, etc."
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
            href="/dashboard/clientes"
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
