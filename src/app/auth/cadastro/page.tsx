"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    lojaNome: "",
    lojaCnpj: "",
    lojaSlug: "",
    adminNome: "",
    adminEmail: "",
    adminSenha: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao cadastrar");
        setLoading(false);
        return;
      }

      router.push("/auth/login");
    } catch {
      setError("Erro ao cadastrar");
      setLoading(false);
    }
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  function handleNomeChange(value: string) {
    const slug = slugify(value);
    setForm((prev) => ({ ...prev, lojaNome: value, lojaSlug: slug }));
  }

  function handleSlugChange(value: string) {
    const slug = slugify(value);
    setForm((prev) => ({ ...prev, lojaSlug: slug }));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white px-6 py-8 shadow-lg shadow-blue-100/50 md:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
            🏪
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Cadastrar Loja</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crie sua conta para começar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Dados da Loja */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Dados da Loja</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={form.lojaNome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Minha Loja"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={form.lojaCnpj}
                  onChange={(e) => setForm({ ...form, lojaCnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Identificador (URL)
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <span className="flex-shrink-0 pl-4 pr-2 text-sm text-gray-400">icell.com/</span>
                  <input
                    type="text"
                    value={form.lojaSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full rounded-xl border-0 px-2 py-3 text-base focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Administrador */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Seus Dados</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Seu Nome
                </label>
                <input
                  type="text"
                  value={form.adminNome}
                  onChange={(e) => setForm({ ...form, adminNome: e.target.value })}
                  placeholder="Seu nome completo"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Seu Email
                </label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="seu@email.com"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sua Senha
                </label>
                <input
                  type="password"
                  value={form.adminSenha}
                  onChange={(e) => setForm({ ...form, adminSenha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all"
          >
            {loading ? "Cadastrando..." : "Cadastrar Loja"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
