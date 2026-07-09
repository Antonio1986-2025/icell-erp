"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProdutoResult {
  id: string;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  precoVenda?: number | null;
  precoCusto?: number | null;
  sku?: string | null;
  categoria: { id: string; nome: string; hasImei: boolean; hasBattery: boolean; hasSerial: boolean };
  _count: { stockItems: number };
}

interface ItemCompra {
  key: string;
  parentId: string;
  nome: string;
  categoria: { hasImei: boolean; hasBattery: boolean; hasSerial: boolean };
  quantidade: number;
  precoCusto: number;
  precoVendaSugerido: number;
  precoAtacadoSugerido: number;
  imei1: string;
  imei2: string;
  serial: string;
  nivelBateria: string;
  garantiaMeses: string;
  condicao: string;
  cor: string;
  capacidade: string;
}

export default function NovaCompraPage() {
  const router = useRouter();
  const [tipoFornecedor, setTipoFornecedor] = useState<"FORNECEDOR" | "CLIENTE">("FORNECEDOR");
  const [fornSearch, setFornSearch] = useState("");
  const [fornResults, setFornResults] = useState<any[]>([]);
  const [fornSelected, setFornSelected] = useState<{ id: string; nome: string; cnpj?: string | null; cpf?: string | null } | null>(null);
  const [showFornSearch, setShowFornSearch] = useState(false);
  const searchTimer = useRef<any>(null);

  // Busca de produtos
  const [prodSearch, setProdSearch] = useState("");
  const [prodResults, setProdResults] = useState<ProdutoResult[]>([]);
  const [showProdSearch, setShowProdSearch] = useState(false);
  const prodTimer = useRef<any>(null);

  // Itens da compra
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [desconto, setDesconto] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [prazo, setPrazo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function buscarFornecedor(q: string) {
    setFornSearch(q);
    if (prodTimer.current) clearTimeout(prodTimer.current);
    if (!q.trim()) { setFornResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const endpoint = tipoFornecedor === "FORNECEDOR" ? "fornecedores" : "clientes";
          const r = await fetch(`/api/${endpoint}?search=${encodeURIComponent(q)}`);
          if (r.ok) {
            const data = await r.json();
            const results = endpoint === "fornecedores" ? (data.fornecedores || []) : (Array.isArray(data) ? data : data.clientes || []);
          setFornResults(results);
          setShowFornSearch(true);
        }
      } catch {}
    }, 300);
  }

  function selecionarFornecedor(f: any) {
    setFornSelected(f);
    setFornSearch(f.nome || f.nome);
    setShowFornSearch(false);
    setFornResults([]);
  }

  useEffect(() => {
    if (tipoFornecedor === "FORNECEDOR") {
      setFornResults([]);
      setShowFornSearch(false);
    }
  }, [tipoFornecedor]);

  function buscarProduto(q: string) {
    setProdSearch(q);
    if (prodTimer.current) clearTimeout(prodTimer.current);
    if (!q.trim()) { setProdResults([]); return; }
    prodTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/produtos?search=${encodeURIComponent(q)}&limit=8`);
        if (r.ok) {
          const data = await r.json();
          setProdResults(data.produtos || []);
          setShowProdSearch(true);
        }
      } catch {}
    }, 300);
  }

  function adicionarProduto(p: ProdutoResult) {
    const novoItem: ItemCompra = {
      key: `${p.id}-${Date.now()}`,
      parentId: p.id,
      nome: `${p.marca ? p.marca + " " : ""}${p.nome}${p.modelo ? " " + p.modelo : ""}`,
      categoria: { hasImei: p.categoria.hasImei, hasBattery: p.categoria.hasBattery, hasSerial: p.categoria.hasSerial },
      quantidade: 1,
      precoCusto: p.precoCusto || 0,
      precoVendaSugerido: p.precoVenda || 0,
      precoAtacadoSugerido: 0,
      imei1: "",
      imei2: "",
      serial: "",
      nivelBateria: "",
      garantiaMeses: "",
      condicao: "NOVO",
      cor: "",
      capacidade: "",
    };
    setItens([...itens, novoItem]);
    setProdSearch("");
    setProdResults([]);
    setShowProdSearch(false);
  }

  function removerItem(key: string) {
    setItens(itens.filter(i => i.key !== key));
  }

  function atualizarItem(key: string, campo: string, valor: any) {
    setItens(itens.map(i => {
      if (i.key !== key) return i;
      const updated = { ...i, [campo]: valor };
      // Calcular preço sugerido automaticamente (margem 40% sobre custo)
      if (campo === "precoCusto" && Number(valor) > 0) {
        const custo = Number(valor);
        const margem = 0.4;
        updated.precoVendaSugerido = Math.round(custo * (1 + margem) * 100) / 100;
        updated.precoAtacadoSugerido = Math.round(custo * (1 + margem * 0.7) * 100) / 100;
      }
      return updated;
    }));
  }

  function calcularMargem(custo: number, venda: number): string {
    if (!custo || !venda) return "—";
    return ((venda - custo) / custo * 100).toFixed(1) + "%";
  }

  const subtotal = itens.reduce((acc, i) => acc + (i.precoCusto * i.quantidade), 0);
  const total = subtotal - Number(desconto || 0);

  async function salvarCompra() {
    if (itens.length === 0) {
      setError("Adicione pelo menos um produto");
      return;
    }
    if (!fornSelected && tipoFornecedor === "FORNECEDOR") {
      setError("Selecione um fornecedor");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const r = await fetch("/api/compras/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoFornecedor,
          fornecedorId: tipoFornecedor === "FORNECEDOR" ? fornSelected?.id : undefined,
          clienteId: tipoFornecedor === "CLIENTE" ? fornSelected?.id : undefined,
          prazoEntregaDias: prazo || undefined,
          observacoes,
          desconto: Number(desconto || 0),
          itens: itens.map(i => ({
            parentId: i.parentId,
            quantidade: i.quantidade,
            precoCusto: i.precoCusto,
            precoVendaSugerido: i.precoVendaSugerido || undefined,
            imei1: i.categoria.hasImei ? i.imei1 : undefined,
            imei2: i.categoria.hasImei ? i.imei2 : undefined,
            serial: i.categoria.hasSerial ? i.serial : undefined,
            nivelBateria: i.categoria.hasBattery ? (i.nivelBateria ? parseInt(i.nivelBateria) : undefined) : undefined,
            condicao: i.condicao || undefined,
            cor: i.cor || undefined,
            capacidade: i.capacidade || undefined,
          })),
        }),
      });

      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Erro ao criar compra");
        setSaving(false);
        return;
      }

      router.push("/dashboard/compras");
    } catch {
      setError("Erro ao salvar compra");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛒 Nova Compra</h1>
          <p className="mt-1 text-sm text-gray-500">Registre a entrada de produtos no estoque</p>
        </div>
        <Link
          href="/dashboard/compras"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Voltar
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Toggle Fornecedor / Cliente */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Entrada</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setTipoFornecedor("FORNECEDOR"); setFornSelected(null); setFornSearch(""); }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              tipoFornecedor === "FORNECEDOR"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🏭 Fornecedor (CNPJ)
          </button>
          <button
            type="button"
            onClick={() => { setTipoFornecedor("CLIENTE"); setFornSelected(null); setFornSearch(""); }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              tipoFornecedor === "CLIENTE"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            👤 Cliente (CPF)
          </button>
        </div>
      </div>

      {/* Busca e seleção de Fornecedor/Cliente */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {tipoFornecedor === "FORNECEDOR" ? "Fornecedor" : "Cliente"}
        </label>
        <div className="relative">
          <input
            type="text"
            value={fornSearch}
            onChange={(e) => buscarFornecedor(e.target.value)}
            placeholder={tipoFornecedor === "FORNECEDOR" ? "Buscar fornecedor por nome ou CNPJ..." : "Buscar cliente por nome ou CPF..."}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {showFornSearch && fornResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
              {fornResults.map((f: any) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selecionarFornecedor(f)}
                  className="w-full border-b border-gray-50 px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{f.nome}</p>
                  <p className="text-xs text-gray-500">{f.cnpj || f.cpf || f.telefone || ""}</p>
                </button>
              ))}
            </div>
          )}
          {fornSelected && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <span className="text-green-600 text-xs font-medium">✓</span>
              <span className="text-sm text-green-800">{fornSelected.nome}</span>
              {fornSelected.cnpj && <span className="text-xs text-green-600">({fornSelected.cnpj})</span>}
            </div>
          )}
        </div>
      </div>

      {/* Produtos */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase text-gray-700">Produtos</h2>
          <span className="text-xs text-gray-500">{itens.length} item(ns)</span>
        </div>

        {/* Busca de Produtos */}
        <div className="relative mb-4">
          <input
            type="text"
            value={prodSearch}
            onChange={(e) => buscarProduto(e.target.value)}
            placeholder="🔍 Buscar produto do catálogo para adicionar..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {showProdSearch && prodResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
              {prodResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => adicionarProduto(p)}
                  className="w-full border-b border-gray-50 px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{p.marca ? p.marca + " " : ""}{p.nome}{p.modelo ? " " + p.modelo : ""}</p>
                  <p className="text-xs text-gray-500">
                    {p.categoria.nome} · SKU: {p.sku || "—"} · Estoque: {p._count.stockItems} un
                    {p.precoVenda && ` · Venda: R$ ${p.precoVenda.toFixed(2)}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de Itens Adicionados */}
        {itens.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm text-gray-500">Nenhum produto adicionado</p>
            <p className="text-xs text-gray-400 mt-1">Busque produtos do catálogo acima</p>
          </div>
        ) : (
          <div className="space-y-4">
            {itens.map((item) => (
              <div key={item.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                {/* Cabeçalho do Item */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{item.nome}</p>
                    <p className="text-xs text-gray-500">
                      {item.condicao === "NOVO" ? "📦 Novo" : "🔄 Usado"}
                      {item.cor && ` · ${item.cor}`}
                      {item.capacidade && ` · ${item.capacidade}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerItem(item.key)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    ✕
                  </button>
                </div>

                {/* Quantidade e Preços */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(item.key, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Preço Compra (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.precoCusto}
                      onChange={(e) => atualizarItem(item.key, "precoCusto", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Sugerido Varejo
                      {item.precoCusto > 0 && (
                        <span className="text-blue-600 ml-1">({calcularMargem(item.precoCusto, item.precoVendaSugerido)})</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.precoVendaSugerido}
                      onChange={(e) => atualizarItem(item.key, "precoVendaSugerido", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Sugerido Atacado
                      {item.precoCusto > 0 && item.precoAtacadoSugerido > 0 && (
                        <span className="text-gray-400 ml-1">({calcularMargem(item.precoCusto, item.precoAtacadoSugerido)})</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.precoAtacadoSugerido}
                      onChange={(e) => atualizarItem(item.key, "precoAtacadoSugerido", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Campos Específicos por Categoria */}
                {(item.categoria.hasImei || item.categoria.hasSerial || item.categoria.hasBattery) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                    {item.categoria.hasImei && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">📱 IMEI 1 *</label>
                          <input
                            type="text"
                            value={item.imei1}
                            onChange={(e) => atualizarItem(item.key, "imei1", e.target.value)}
                            placeholder="Digite o IMEI"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">📱 IMEI 2</label>
                          <input
                            type="text"
                            value={item.imei2}
                            onChange={(e) => atualizarItem(item.key, "imei2", e.target.value)}
                            placeholder="Opcional"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                    {item.categoria.hasSerial && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">🔢 Serial</label>
                        <input
                          type="text"
                          value={item.serial}
                          onChange={(e) => atualizarItem(item.key, "serial", e.target.value)}
                          placeholder="Nº de série"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                    {item.categoria.hasBattery && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">🔋 Bateria (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.nivelBateria}
                          onChange={(e) => atualizarItem(item.key, "nivelBateria", e.target.value)}
                          placeholder="Ex: 85"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">🛡️ Garantia (meses)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.garantiaMeses}
                        onChange={(e) => atualizarItem(item.key, "garantiaMeses", e.target.value)}
                        placeholder="Ex: 12"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informações Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">📉 Desconto (R$)</label>
          <input
            type="number"
            step="0.01"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">📅 Prazo Entrega</label>
          <input
            type="number"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            placeholder="Dias"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">📝 Observações</label>
          <input
            type="text"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Subtotal ({itens.length} itens)</span>
          <span className="text-lg font-bold text-gray-900">R$ {subtotal.toFixed(2)}</span>
        </div>
        {Number(desconto) > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Desconto</span>
            <span className="text-sm text-red-500">- R$ {Number(desconto).toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="text-base font-bold text-gray-900">Total da Compra</span>
          <span className="text-xl font-bold text-blue-600">R$ {total.toFixed(2)}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Link
          href="/dashboard/compras"
          className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          onClick={salvarCompra}
          disabled={saving || itens.length === 0}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : "✅ Registrar Compra"}
        </button>
      </div>
    </div>
  );
}
