"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Category = {
  id: string;
  nome: string;
  hasImei: boolean;
  hasBattery: boolean;
  hasSerial: boolean;
};

type StockItemForm = {
  imei: string;
  serialNumber: string;
  cor: string;
  capacidade: string;
  nivelBateria: string;
  condicao: string;
  acessoriosInclusos: string;
  observacoes: string;
};

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nome: "",
    marca: "",
    modelo: "",
    categoriaId: "",
    tipo: "NOVO",
    precoVenda: "",
    precoCusto: "",
    sku: "",
    garantiaPadrao: "90",
    descricao: "",
  });

  const [stockItem, setStockItem] = useState<StockItemForm>({
    imei: "",
    serialNumber: "",
    cor: "",
    capacidade: "",
    nivelBateria: "",
    condicao: "EXCELENTE",
    acessoriosInclusos: "",
    observacoes: "",
  });

  const [imeisNovo, setImeisNovo] = useState<string[]>([""]);
  const [fornecedorId, setFornecedorId] = useState("");

  const cat = categories.find((c) => c.id === form.categoriaId);

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((d) => setCategories(d.categorias));
    fetch("/api/fornecedores")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.fornecedores || []))
      .catch(() => {});
  }, []);

  function updateForm(updates: Partial<typeof form>) {
    setForm({ ...form, ...updates });
  }

  function updateStock(updates: Partial<StockItemForm>) {
    setStockItem({ ...stockItem, ...updates });
  }

  function addImeiInput() {
    setImeisNovo([...imeisNovo, ""]);
  }

  function updateImei(index: number, value: string) {
    const novos = [...imeisNovo];
    novos[index] = value;
    setImeisNovo(novos);
  }

  function removeImei(index: number) {
    setImeisNovo(imeisNovo.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validar IMEI obrigatório
    if (cat?.hasImei && form.tipo === "NOVO") {
      const imeis = imeisNovo.map((i) => i.trim()).filter(Boolean);
      if (imeis.length === 0) {
        setError("IMEI é obrigatório para celulares. Adicione pelo menos um IMEI.");
        setLoading(false);
        return;
      }
    }

    if (cat?.hasImei && form.tipo === "USADO" && !stockItem.imei.trim()) {
      setError("IMEI é obrigatório para celulares usados.");
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
        precoVenda: form.precoVenda ? parseFloat(form.precoVenda) : null,
        precoCusto: form.precoCusto ? parseFloat(form.precoCusto) : null,
        sku: form.sku || null,
        garantiaPadrao: form.garantiaPadrao ? parseInt(form.garantiaPadrao) : null,
        descricao: form.descricao || null,
      };

      if (form.tipo === "USADO") {
        body.stockItem = {
          imei: cat?.hasImei ? stockItem.imei : null,
          serialNumber: cat?.hasSerial ? stockItem.serialNumber : null,
          cor: stockItem.cor || null,
          capacidade: stockItem.capacidade || null,
          nivelBateria: cat?.hasBattery && stockItem.nivelBateria ? parseInt(stockItem.nivelBateria) : null,
          condicao: stockItem.condicao || null,
          acessoriosInclusos: stockItem.acessoriosInclusos || null,
          observacoes: stockItem.observacoes || null,
          fornecedorId: fornecedorId || null,
        };
      }

      if (form.tipo === "NOVO" && cat?.hasImei) {
        const imeis = imeisNovo.map((i) => i.trim()).filter(Boolean);
        if (imeis.length > 0) {
          body.imeis = imeis;
        }
      }

      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar");
        setLoading(false);
        return;
      }

      router.push("/dashboard/produtos");
    } catch {
      setError("Erro ao criar produto");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/produtos" className="text-sm text-blue-600 hover:underline">
          Produtos
        </Link>
        <span className="text-gray-400">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-4">
        {/* Dados Básicos */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dados Básicos</h2>
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => updateForm({ nome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
                placeholder='Ex: iPhone 16 Pro Max 256GB'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Marca</label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => updateForm({ marca: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Ex: Apple"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Modelo</label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => updateForm({ modelo: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Ex: A3296"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Categoria</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700">SKU (opcional)</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => updateForm({ sku: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="EAN/GTIN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                value={form.precoVenda}
                onChange={(e) => updateForm({ precoVenda: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                value={form.precoCusto}
                onChange={(e) => updateForm({ precoCusto: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Garantia Padrão (dias)</label>
              <input
                type="number"
                value={form.garantiaPadrao}
                onChange={(e) => updateForm({ garantiaPadrao: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(e) => updateForm({ descricao: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tipo / Condição */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Tipo do Produto</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <label className="flex items-center gap-3 rounded-lg border border-gray-300 p-4 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input
                type="radio"
                name="tipo"
                value="NOVO"
                checked={form.tipo === "NOVO"}
                onChange={() => updateForm({ tipo: "NOVO" })}
                className="h-4 w-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">Produto Novo</p>
                <p className="text-sm text-gray-500">Modelo compartilhado, múltiplos IMEIs</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-gray-300 p-4 cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input
                type="radio"
                name="tipo"
                value="USADO"
                checked={form.tipo === "USADO"}
                onChange={() => updateForm({ tipo: "USADO" })}
                className="h-4 w-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">Produto Usado</p>
                <p className="text-sm text-gray-500">Aparelho único com IMEI próprio</p>
              </div>
            </label>
          </div>
        </div>

        {/* IMEIs para NOVO */}
        {form.tipo === "NOVO" && cat?.hasImei && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">IMEIs</h2>
            <p className="mb-3 text-sm font-semibold text-red-600">⚠️ IMEI obrigatório para celulares</p>
            {imeisNovo.map((imei, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => updateImei(i, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder={`IMEI ${i + 1}`}
                />
                {imeisNovo.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImei(i)}
                    className="mt-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addImeiInput}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              + Adicionar outro IMEI
            </button>
          </div>
        )}

        {/* Detalhes do Usado */}
        {form.tipo === "USADO" && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Detalhes do Aparelho Usado</h2>
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
              {cat?.hasImei && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">IMEI *</label>
                  <input
                    type="text"
                    value={stockItem.imei}
                    onChange={(e) => updateStock({ imei: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    required
                    placeholder="IMEI 1"
                  />
                </div>
              )}
              {cat?.hasSerial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Série</label>
                  <input
                    type="text"
                    value={stockItem.serialNumber}
                    onChange={(e) => updateStock({ serialNumber: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="Serial"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Cor</label>
                <input
                  type="text"
                  value={stockItem.cor}
                  onChange={(e) => updateStock({ cor: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Preto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacidade</label>
                <input
                  type="text"
                  value={stockItem.capacidade}
                  onChange={(e) => updateStock({ capacidade: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: 256GB"
                />
              </div>
              {cat?.hasBattery && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nível da Bateria (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stockItem.nivelBateria}
                    onChange={(e) => updateStock({ nivelBateria: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: 85"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Condição Física</label>
                <select
                  value={stockItem.condicao}
                  onChange={(e) => updateStock({ condicao: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BOM">Bom</option>
                  <option value="REGULAR">Regular</option>
                  <option value="RUIM">Ruim</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fornecedor</label>
                <select
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sem fornecedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Acessórios Inclusos</label>
                <input
                  type="text"
                  value={stockItem.acessoriosInclusos}
                  onChange={(e) => updateStock({ acessoriosInclusos: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Carregador, Caixa, Fone"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={stockItem.observacoes}
                  onChange={(e) => updateStock({ observacoes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Riscos na tela, marcas de uso, etc."
                />
              </div>
            </div>
          </div>
        )}

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
            href="/dashboard/produtos"
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
