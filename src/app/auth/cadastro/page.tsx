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
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          Cadastrar Loja
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome da Loja
            </label>
            <input
              type="text"
              value={form.lojaNome}
              onChange={(e) => handleNomeChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Identificador (URL)
            </label>
            <div className="flex items-center rounded-lg border border-gray-300">
              <span className="px-3 text-sm text-gray-500">icell.com/</span>
                <input
                type="text"
                value={form.lojaSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full rounded-r-lg border-0 px-2 py-2 focus:outline-none"
                required
              />
            </div>
          </div>

          <hr className="my-4" />

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Seu Nome
            </label>
            <input
              type="text"
              value={form.adminNome}
              onChange={(e) => setForm({ ...form, adminNome: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Cadastrar Loja"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
