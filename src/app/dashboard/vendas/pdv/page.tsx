"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface ProductSearchResult {
  id: string;
  nome: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  precoVenda: number | null;
  precoCusto: number | null;
  categoria: { nome: string; hasImei: boolean };
  stockItems: { id: string; imei: string | null; cor: string | null; capacidade: string | null; condicao: string | null; precoVenda: number | null }[];
  _count: { stockItems: number };
}

interface CartItem {
  key: string;
  stockItemId?: string;
  parentId?: string;
  nome: string;
  imei?: string;
  precoUnit: number;
  quantidade: number;
  tipo: "SAIDA" | "ENTRADA";
  isLaudo?: boolean;
  laudoId?: string;
}

interface LaudoPendente {
  id: string;
  aparelhoNome: string;
  imei: string | null;
  marca: string | null;
  modelo: string | null;
  valorEstimado: number | null;
  cliente: { nome: string; cpf: string | null } | null;
}

interface ClienteResult {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
}

export default function PdvPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingReserva, setLoadingReserva] = useState(false);
  const [cliente, setCliente] = useState<ClienteResult | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<ClienteResult[]>([]);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [laudoVinculado, setLaudoVinculado] = useState<LaudoPendente | null>(null);
  const [showLaudoSelector, setShowLaudoSelector] = useState(false);
  const [laudosPendentes, setLaudosPendentes] = useState<LaudoPendente[]>([]);
  const [searchProd, setSearchProd] = useState("");
  const [prodResults, setProdResults] = useState<ProductSearchResult[]>([]);
  const [showProdSearch, setShowProdSearch] = useState(false);
  const [prodSearchLoading, setProdSearchLoading] = useState(false);
  const [prodSearchError, setProdSearchError] = useState("");
  const [desconto, setDesconto] = useState("");
  const [payments, setPayments] = useState<{ metodo: string; valor: number; parcelas: number }[]>([
    { metodo: "DINHEIRO", valor: 0, parcelas: 1 },
  ]);
  const [troco, setTroco] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"produtos" | "reservas">("produtos");
  const [reservaAtiva, setReservaAtiva] = useState<any | null>(null);
  const [reservaSearch, setReservaSearch] = useState("");
  const [reservaResults, setReservaResults] = useState<any[]>([]);
  const [showReservaResults, setShowReservaResults] = useState(false);
  const [reservasDoCliente, setReservasDoCliente] = useState<any[]>([]);

  useEffect(() => {
    // Carrega reserva automaticamente se veio via ?reserva=ID da URL
    const params = new URLSearchParams(window.location.search);
    const reservaId = params.get("reserva");
    if (reservaId) {
      setAbaAtiva("reservas");
      setLoadingReserva(true);
      fetch(`/api/vendas/${reservaId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.id) {
            setReservaAtiva(data);
            if (data.cliente) {
              setCliente(data.cliente);
              setClienteSearch(data.cliente.nome);
            }
            const item = data.items?.[0];
            if (item) {
              setCart([{
                key: `reserva-${data.id}`,
                stockItemId: item.stockItem?.id,
                parentId: item.parent?.id,
                nome: item.parent?.nome || "Produto",
                imei: item.stockItem?.imei || undefined,
                precoUnit: item.stockItem?.precoVenda || item.parent?.precoVenda || 0,
                quantidade: 1,
                tipo: "SAIDA",
              }]);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReserva(false));
    }
  }, []);

  const subtotal = cart
    .filter((i) => i.tipo === "SAIDA")
    .reduce((acc, i) => acc + i.precoUnit * i.quantidade, 0);

  const valorLaudo = laudoVinculado?.valorEstimado || 0;
  const valorDesconto = parseFloat(desconto || "0");
  const total = subtotal - valorDesconto - valorLaudo;
  const totalPago = payments.reduce((s, p) => s + p.valor, 0);
  const falta = Math.max(0, total - totalPago);

  async function buscarProdutos(q: string) {
    if (!q.trim()) { setProdResults([]); setShowProdSearch(false); setProdSearchError(""); return; }
    setProdSearchLoading(true);
    setProdSearchError("");
    try {
      const res = await fetch(`/api/produtos?search=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Erro ao buscar" }));
        setProdSearchError(errData.error || `Erro ${res.status}`);
        setProdResults([]);
      } else {
        const data = await res.json();
        setProdResults(data.produtos || []);
        if (!data.produtos?.length) {
          setProdSearchError("Nenhum produto encontrado para \"" + q + "\"");
        }
      }
    } catch (err) {
      setProdSearchError("Erro de conexão ao buscar produtos");
      setProdResults([]);
    }
    setProdSearchLoading(false);
    setShowProdSearch(true);
  }

  function addToCart(prod: ProductSearchResult) {
      // Verificar se tem estoque
      if (prod._count.stockItems === 0 && prod.stockItems.length === 0) {
        setProdSearchError(`"${prod.nome}" está sem estoque`);
        return;
      }
      if (prod.categoria.hasImei && prod.stockItems.length > 0) {
      for (const stock of prod.stockItems) {
        setCart((prev) => [
          ...prev,
          {
            key: `${stock.id}-${Date.now()}-${Math.random()}`,
            stockItemId: stock.id,
            nome: `${prod.nome} ${stock.cor ? `(${stock.cor})` : ""} ${stock.capacidade || ""}`,
            imei: stock.imei || undefined,
            precoUnit: stock.precoVenda || prod.precoVenda || 0,
            quantidade: 1,
            tipo: "SAIDA",
          },
        ]);
      }
    } else {
      const existing = cart.find((i) => i.parentId === prod.id && i.tipo === "SAIDA");
      if (existing) {
        setCart((prev) =>
          prev.map((i) =>
            i.key === existing.key ? { ...i, quantidade: i.quantidade + 1 } : i
          )
        );
      } else {
        setCart((prev) => [
          ...prev,
          {
            key: `${prod.id}-${Date.now()}`,
            parentId: prod.id,
            nome: prod.nome,
            precoUnit: prod.precoVenda || 0,
            quantidade: 1,
            tipo: "SAIDA",
          },
        ]);
      }
    }
    setShowProdSearch(false);
    setSearchProd("");
    setProdResults([]);
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  // Reservas search
  async function buscarReservas(q: string) {
    setReservaSearch(q);
    if (!q.trim()) { setReservaResults([]); return; }
    const res = await fetch(`/api/reservas?cliente=${encodeURIComponent(q)}`);
    if (res.ok) setReservaResults(await res.json());
    setShowReservaResults(true);
  }

  function selecionarReserva(reserva: any) {
    setReservaAtiva(reserva);
    if (reserva.cliente) {
      setCliente(reserva.cliente);
      setClienteSearch(reserva.cliente.nome);
    }
    const item = reserva.items?.[0];
    if (item) {
      setCart([{
        key: `reserva-${reserva.id}`,
        stockItemId: item.stockItem?.id,
        parentId: item.parent?.id,
        nome: item.parent?.nome || "Produto",
        imei: item.stockItem?.imei || undefined,
        precoUnit: item.stockItem?.precoVenda || item.parent?.precoVenda || 0,
        quantidade: 1,
        tipo: "SAIDA",
      }]);
    }
    setShowReservaResults(false);
    setReservaSearch("");
  }

  function limparReserva() {
    setReservaAtiva(null);
    setCart([]);
    setCliente(null);
    setClienteSearch("");
  }

  // Cliente search
  async function buscarCliente(q: string) {
    setClienteSearch(q);
    if (!q.trim()) { setClienteResults([]); return; }
    const res = await fetch(`/api/clientes?search=${encodeURIComponent(q)}`);
    if (res.ok) setClienteResults(await res.json());
    setShowClienteSearch(true);
  }

  function selecionarCliente(c: ClienteResult) {
    setCliente(c);
    setShowClienteSearch(false);
    setClienteSearch(c.nome);
    // Verifica se o cliente tem reservas pendentes
    fetch(`/api/reservas?cliente=${encodeURIComponent(c.nome)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((reservas) => setReservasDoCliente(reservas || []))
      .catch(() => setReservasDoCliente([]));
  }

  // Laudo selector
  async function abrirLaudoSelector() {
    const res = await fetch("/api/laudos?status=PENDENTE");
    if (res.ok) {
      const dados = await res.json();
      const comCheck = await Promise.all(
        dados.slice(0, 20).map(async (l: any) => {
          const imei = l.imei?.replace(/\D/g, "");
          if (imei?.length >= 8) {
            try {
              const r = await fetch(`/api/imei/check?imei=${imei}`);
              if (r.ok) return { ...l, imeiCheck: await r.json() };
            } catch { /* ignore */ }
          }
          return { ...l, imeiCheck: null };
        })
      );
      setLaudosPendentes(comCheck);
    }
    setShowLaudoSelector(true);
  }

  function selecionarLaudo(laudo: LaudoPendente) {
    setLaudoVinculado(laudo);
    setShowLaudoSelector(false);
    setCart((prev) => [
      ...prev.filter((i) => !i.isLaudo),
      {
        key: `laudo-${laudo.id}`,
        nome: `${laudo.aparelhoNome} (troca)`,
        imei: laudo.imei || undefined,
        precoUnit: -(laudo.valorEstimado || 0),
        quantidade: 1,
        tipo: "ENTRADA",
        isLaudo: true,
        laudoId: laudo.id,
      },
    ]);
  }

  function atualizarPagamento(index: number, field: string, value: any) {
    setPayments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function adicionarPagamento() {
    setPayments((prev) => [...prev, { metodo: "DINHEIRO", valor: 0, parcelas: 1 }]);
  }

  function removerPagamento(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  function removerLaudo() {
    setLaudoVinculado(null);
    setCart((prev) => prev.filter((i) => !i.isLaudo));
  }

  async function finalizarVenda() {
    setLoading(true);
    setError("");

    try {
      const pgtoValidos = payments.filter((p) => p.valor > 0);

      if (reservaAtiva) {
        const body: any = {
          status: "CONCLUIDA",
          payments: pgtoValidos,
          observacoes: pgtoValidos.map((p) => `${p.metodo} ${formatCurrency(p.valor)}${p.parcelas > 1 ? ` (${p.parcelas}x)` : ""}`).join(" + "),
        };
        if (desconto) body.desconto = parseFloat(desconto);

        const res = await fetch(`/api/vendas/${reservaAtiva.id}/finalizar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erro ao finalizar venda");
          setLoading(false);
          return;
        }

        const venda = await res.json();
        router.push(`/dashboard/vendas/${venda.id}`);
      } else {
        let clienteId = cliente?.id;

        if (!clienteId && clienteSearch.trim()) {
          const res = await fetch("/api/clientes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: clienteSearch.trim() }),
          });
          if (res.ok) {
            const data = await res.json();
            clienteId = data.id;
          }
        }

        const saidaItems = cart.filter((i) => !i.isLaudo);

        const body: any = {
          clienteId,
          items: saidaItems.map((i) => ({
            stockItemId: i.stockItemId || null,
            parentId: i.parentId || null,
            tipo: i.tipo,
            quantidade: i.quantidade,
            precoUnit: i.precoUnit,
          })),
          desconto,
          payments: pgtoValidos,
          observacoes: pgtoValidos.map((p) => `${p.metodo} ${formatCurrency(p.valor)}${p.parcelas > 1 ? ` (${p.parcelas}x)` : ""}`).join(" + "),
        };

        if (laudoVinculado) {
          body.laudoId = laudoVinculado.id;
        }

        const res = await fetch("/api/vendas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erro ao finalizar venda");
          setLoading(false);
          return;
        }

        const venda = await res.json();
        router.push(`/dashboard/vendas/${venda.id}`);
      }
    } catch {
      setError("Erro ao finalizar venda");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:h-[calc(100vh-6rem)]">
      {/* ===== LADO ESQUERDO: Busca e Carrinho ===== */}
      <div className="flex flex-col gap-4 lg:w-3/5">

        {/* Abas */}
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
          <button
            onClick={() => setAbaAtiva("produtos")}
            className={`snap-start shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              abaAtiva === "produtos"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🛒 Produtos
          </button>
          <button
            onClick={() => setAbaAtiva("reservas")}
            className={`snap-start shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              abaAtiva === "reservas"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📋 Reservas
          </button>
          {reservaAtiva && (
            <div className="ml-auto flex shrink-0 items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
              <span className="text-xs text-amber-700 font-medium">
                🔖 Reserva #{reservaAtiva.numero}
              </span>
              <button onClick={limparReserva} className="text-xs text-red-500 hover:text-red-700 font-bold">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo da aba */}
        {abaAtiva === "reservas" && !reservaAtiva && !loadingReserva && (
          <div className="relative rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">Buscar Reserva</h2>
            <input
              type="text"
              value={reservaSearch}
              onChange={(e) => buscarReservas(e.target.value)}
              placeholder="Nome ou CPF do cliente..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              autoFocus
            />
            {showReservaResults && reservaResults.length > 0 && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {reservaResults.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => selecionarReserva(r)}
                    className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      #{r.numero} — {r.items?.[0]?.parent?.nome || "Produto"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span>Cliente: {r.cliente?.nome || "—"}</span>
                      <span>Vendedor: {r.vendedor?.nome || "—"}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {formatCurrency(r.items?.[0]?.stockItem?.precoVenda || r.items?.[0]?.parent?.precoVenda || 0)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loadingReserva && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
            <p className="text-sm font-medium text-blue-700">⏳ Carregando reserva...</p>
          </div>
        )}

        {abaAtiva === "reservas" && reservaAtiva && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-900">✅ Reserva #{reservaAtiva.numero} carregada</p>
            <p className="mt-1 text-xs text-green-700">
              Cliente: {reservaAtiva.cliente?.nome} | Produto: {reservaAtiva.items?.[0]?.parent?.nome}
            </p>
            <p className="mt-1 text-sm font-bold text-green-800">
              {formatCurrency(reservaAtiva.items?.[0]?.stockItem?.precoVenda || reservaAtiva.items?.[0]?.parent?.precoVenda || 0)}
            </p>
          </div>
        )}

        {/* Busca de Produtos */}
        {abaAtiva === "produtos" && (
          <div className="relative rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">Adicionar Produto</h2>
            <input
              type="text"
              value={searchProd}
              onChange={(e) => { setSearchProd(e.target.value); buscarProdutos(e.target.value); }}
              placeholder="🔍 Buscar por nome, SKU, IMEI..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
            {showProdSearch && prodResults.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {prodResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.nome}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {p.marca} {p.modelo} | {p.categoria.nome}
                          {p.stockItems.length > 0 && ` | ${p.stockItems.length} em estoque`}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0">
                        {p.precoVenda ? formatCurrency(p.precoVenda) : "—"}
                      </p>
                    </div>
                    {p._count.stockItems === 0 && p.stockItems.length === 0 && (
                      <p className="mt-1 text-xs font-bold text-red-500">🚫 Sem estoque</p>
                    )}
                  </button>
                ))}
              </div>
            )}
            {showProdSearch && prodSearchLoading && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-sm text-gray-500">🔍 Buscando...</p>
              </div>
            )}
            {showProdSearch && !prodSearchLoading && prodResults.length === 0 && prodSearchError && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-500">{prodSearchError}</p>
              </div>
            )}
            {showProdSearch && !prodSearchLoading && prodResults.length === 0 && !prodSearchError && searchProd.trim() && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-400">Nenhum resultado para "{searchProd}"</p>
              </div>
            )}
          </div>
        )}

        {/* Carrinho */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">
            🛒 Carrinho ({cart.filter((i) => i.tipo === "SAIDA").length} itens)
          </h2>

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Carrinho vazio. 🔍 Adicione produtos acima.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.key} className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                  item.isLaudo ? "border-blue-200 bg-blue-50" : "border-gray-100"
                }`}>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.isLaudo ? "🔄 " : ""}{item.nome}
                      </p>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      {item.imei && <span className="font-mono">IMEI: {item.imei}</span>}
                      {item.isLaudo && <span className="text-blue-600">Trade-in</span>}
                      <span>Qtd: {item.quantidade}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {item.isLaudo ? "+ " : ""}{formatCurrency(item.precoUnit)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.key)}
                    className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 active:scale-95 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {cart.filter((i) => i.tipo === "SAIDA").length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== LADO DIREITO: Cliente, Pagamento, Finalizar ===== */}
      <div className="flex flex-col gap-4 lg:w-2/5">

        {/* Cliente */}
        <div className="relative rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">👤 Cliente</h2>
          <input
            type="text"
            value={clienteSearch}
            onChange={(e) => buscarCliente(e.target.value)}
            placeholder="Nome, CPF ou telefone..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
          {showClienteSearch && clienteResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
              {clienteResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selecionarCliente(c)}
                  className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                  <p className="text-xs text-gray-500">{c.cpf && `CPF: ${c.cpf} | `}{c.telefone && `Tel: ${c.telefone}`}</p>
                </button>
              ))}
            </div>
          )}
          {cliente && (
            <p className="mt-2 text-xs text-green-600">✅ {cliente.nome} {cliente.cpf && `(${cliente.cpf})`}</p>
          )}

          {/* Aviso de reserva pendente do cliente */}
          {cliente && reservasDoCliente.length > 0 && !reservaAtiva && (
            <div className="mt-3 rounded-xl border-l-4 border-l-amber-400 bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase text-amber-800">📋 Reserva Pendente</p>
                  {reservasDoCliente.map((r) => (
                    <div key={r.id} className="mt-2">
                      <p className="text-sm font-medium text-gray-900">
                        #{r.numero} — {r.items?.[0]?.parent?.nome || "Produto"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString()} | {formatCurrency(r.items?.[0]?.stockItem?.precoVenda || r.items?.[0]?.parent?.precoVenda || 0)}
                      </p>
                      <button
                        onClick={() => selecionarReserva(r)}
                        className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 active:scale-95 transition-all"
                      >
                        Carregar no Carrinho
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Laudo / Trade-in */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">🔄 Trade-in (Troca)</h2>
          {!laudoVinculado ? (
            <button
              onClick={abrirLaudoSelector}
              className="w-full rounded-xl border-2 border-dashed border-blue-300 px-4 py-4 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-[0.98]"
            >
              + Vincular Laudo de Troca
            </button>
          ) : (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">{laudoVinculado.aparelhoNome}</p>
                  <p className="text-xs text-blue-600">{laudoVinculado.imei && `IMEI: ${laudoVinculado.imei}`}</p>
                  <p className="text-sm font-bold text-blue-800 mt-1">- {formatCurrency(laudoVinculado.valorEstimado || 0)}</p>
                </div>
                <button onClick={removerLaudo} className="text-red-500 hover:text-red-700 text-lg">✕</button>
              </div>
            </div>
          )}

          {showLaudoSelector && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
              {laudosPendentes.map((l) => (
                <button
                  key={l.id}
                  onClick={() => selecionarLaudo(l)}
                  className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{l.aparelhoNome}</p>
                  <p className="text-xs text-gray-500">{l.cliente?.nome} | Est: {formatCurrency(l.valorEstimado || 0)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desconto */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">🏷️ Desconto</h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Pagamento */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">💳 Pagamento</h2>
          <div className="space-y-3">
            {payments.map((pgto, idx) => (
              <div key={idx} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Pagamento {idx + 1}</span>
                  {payments.length > 1 && (
                    <button onClick={() => removerPagamento(idx)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remover</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={pgto.metodo}
                    onChange={(e) => atualizarPagamento(idx, "metodo", e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none col-span-2 md:col-span-1"
                  >
                    <option value="DINHEIRO">💵 Dinheiro</option>
                    <option value="PIX">📱 PIX</option>
                    <option value="CARTAO_CREDITO">💳 Crédito</option>
                    <option value="CARTAO_DEBITO">💳 Débito</option>
                    <option value="BOLETO">📄 Boleto</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pgto.valor || ""}
                      onChange={(e) => atualizarPagamento(idx, "valor", parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full rounded-xl border border-gray-300 pl-8 pr-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  {pgto.metodo === "CARTAO_CREDITO" && (
                    <div className="col-span-2">
                      <select
                        value={pgto.parcelas}
                        onChange={(e) => atualizarPagamento(idx, "parcelas", parseInt(e.target.value))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>{p}x {p > 1 ? "sem juros" : "à vista"}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={adicionarPagamento}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-[0.98]"
            >
              + Outra forma de pagamento
            </button>
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pago</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalPago)}</span>
            </div>
            {falta > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Falta</span>
                <span className="font-bold text-red-600">{formatCurrency(falta)}</span>
              </div>
            )}
            {totalPago > total && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Troco</span>
                <span className="font-bold text-blue-600">{formatCurrency(totalPago - total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão Finalizar */}
        <button
          onClick={finalizarVenda}
          disabled={loading || cart.filter((i) => i.tipo === "SAIDA").length === 0}
          className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-green-500/30 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {loading ? "⏳ Finalizando..." : "✅ Finalizar Venda"}
        </button>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700 font-medium">❌ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
