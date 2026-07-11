"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhoneSearch, { type PhoneModel } from "@/components/PhoneSearch";

type Category = {
  id: string;
  nome: string;
};

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedModel, setSelectedModel] = useState<PhoneModel | null>(null);

  const [form, setForm] = useState({
    nome: "",
    marca: "",
    modelo: "",
    categoriaId: "",
    tipo: "NOVO",
    sku: "",
  });

  const [especificacoes, setEspecificacoes] = useState<{
    capacidades: string[];
    cores: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((d) => setCategories(d.categorias));
  }, []);

  function updateForm(updates: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function handlePhoneSelect(model: PhoneModel, categoryId: string) {
    setSelectedModel(model);
    setForm((prev) => ({
      ...prev,
      nome: model.nome,
      marca: model.marca,
      modelo: model.codigoModelo,
      categoriaId: categoryId || prev.categoriaId,
    }));
    setEspecificacoes({
      capacidades: model.capacidades,
      cores: model.cores,
    });
  }

  function handlePhoneClear() {
    setSelectedModel(null);
    setEspecificacoes(null);
    setForm((prev) => {
      // só limpa se o nome atual ainda corresponde ao modelo selecionado
      if (selectedModel && prev.nome === selectedModel.nome) {
        return { ...prev, nome: "", marca: "", modelo: "" };
      }
      return prev;
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    // Validações
    if (!form.nome.trim()) {
      setError("O nome do produto é obrigatório");
      setLoading(false);
      return;
    }
    if (!form.categoriaId) {
      setError("Selecione uma categoria");
      setLoading(false);
      return;
    }

    try {
      const body: any = {
        nome: form.nome,
        marca: form.marca || null,
        modelo: form.modelo || null,
        categoriaId: form.categoriaId,
        tipo: form.tipo,
        precoVenda: null,
        precoCusto: null,
        sku: form.sku || null,
        especificacoes: especificacoes ? JSON.stringify(especificacoes) : null,
      };

      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar produto");
        setLoading(false);
        return;
      }

      router.push("/dashboard/produtos");
    } catch (err) {
      setError("Erro ao criar produto: " + (err instanceof Error ? err.message : "Erro desconhecido"));
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/produtos"
          className="text-sm text-blue-600 hover:underline"
        >
          Produtos
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="mt-6 max-w-3xl space-y-4">
        {/* Busca Inteligente */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <p className="text-sm font-medium text-blue-800">
              Busca Inteligente de Modelos
            </p>
          </div>
          <p className="mb-3 text-xs text-blue-600">
            Digite o nome do celular e selecione para preencher automaticamente
          </p>
          <PhoneSearch
            categories={categories}
            onSelect={handlePhoneSelect}
            onClear={handlePhoneClear}
            selected={selectedModel}
          />
        </div>

        {/* Dados Básicos */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Dados Básicos
          </h2>
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Nome *
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => updateForm({ nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
                placeholder="Ex: iPhone 16"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Marca
              </label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => updateForm({ marca: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Ex: Apple"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Modelo
              </label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => updateForm({ modelo: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Ex: A3296"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Categoria *
              </label>
              <select
                value={form.categoriaId}
                onChange={(e) => updateForm({ categoriaId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                SKU (opcional)
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => updateForm({ sku: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="EAN/GTIN"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Salvando..." : "Salvar Produto"}
          </button>
          <Link
            href="/dashboard/produtos"
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <Link
            href="/dashboard/compras/nova"
            className="text-sm text-blue-600 hover:underline"
          >
            🔗 Cadastrar entrada no estoque
          </Link>
        </div>
      </form>

      <div className="mt-6 max-w-3xl rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-800">💡 Importante</p>
        <p className="mt-1 text-sm text-blue-700">
          O produto será cadastrado no catálogo, mas{" "}
          <strong>não entrará no estoque</strong>. Para adicionar unidades com
          IMEI, acesse <strong>Compras → Nova Compra</strong> e registre a
          entrada.
        </p>
      </div>
    </div>
  );
}
