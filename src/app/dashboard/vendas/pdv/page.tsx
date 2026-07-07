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

  const subtotal = cart
    .filter((i) => i.tipo === "SAIDA")
    .reduce((acc, i) => acc + i.precoUnit * i.quantidade, 0);

  const valorLaudo = laudoVinculado?.valorEstimado || 0;
  const valorDesconto = parseFloat(desconto || "0");
  const total = subtotal - valorDesconto - valorLaudo;
  const totalPago = payments.reduce((s, p) => s + p.valor, 0);
  const falta = Math.max(0, total - totalPago);
  const trocoCalculado = totalPago > total ? totalPago - total : 0;

  async function buscarProdutos(q: string) {
    if (!q.trim()) { setProdResults([]); return; }
    const res = await fetch(`/api/produtos?search=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setProdResults(data.produtos || []);
    }
    setShowProdSearch(true);
  }

  function addToCart(prod: ProductSearchResult) {
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
    // Add the reservation's stock item to cart
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
    // Add trade-in item to cart
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
        // ====== FLUXO RESERVA ======
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
        // ====== FLUXO NORMAL ======
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
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* COLUNA ESQUERDA: Busca e carrinho */}
      <div className="flex w-2/3 flex-col gap-4">
        {/* Abas: Produtos / Reservas */}
        <div className="flex gap-1">
          <button
            onClick={() => setAbaAtiva("produtos")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              abaAtiva === "produtos"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🛒 Produtos
          </button>
          <button
            onClick={() => setAbaAtiva("reservas")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              abaAtiva === "reservas"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📋 Reservas
          </button>
          {reservaAtiva && (
            <div className="ml-auto flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
              <span className="text-xs text-amber-700">
                Reserva #{reservaAtiva.numero} — {reservaAtiva.cliente?.nome}
              </span>
              <button onClick={limparReserva} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo da aba ativa */}
        {abaAtiva === "reservas" && !reservaAtiva && (
          <div className="relative rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">Buscar Reserva</h2>
            <input
              type="text"
              value={reservaSearch}
              onChange={(e) => buscarReservas(e.target.value)}
              placeholder="Nome ou CPF do cliente..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            {showReservaResults && reservaResults.length > 0 && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow">
                {reservaResults.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => selecionarReserva(r)}
                    className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      #{r.numero} — {r.items?.[0]?.parent?.nome || "Produto"}
                    </p>
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      <span>Cliente: {r.cliente?.nome || "—"}</span>
                      <span>Vendedor: {r.vendedor?.nome || "—"}</span>
                      <span>Criada: {new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {formatCurrency(r.items?.[0]?.stockItem?.precoVenda || r.items?.[0]?.parent?.precoVenda || 0)}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {reservaSearch.trim() && reservaResults.length === 0 && (
              <p className="mt-2 text-sm text-gray-400">Nenhuma reserva encontrada</p>
            )}
          </div>
        )}

        {abaAtiva === "reservas" && reservaAtiva && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-900">
              ✅ Reserva #{reservaAtiva.numero} carregada
            </p>
            <p className="mt-1 text-xs text-green-700">
              Cliente: {reservaAtiva.cliente?.nome} | 
              Produto: {reservaAtiva.items?.[0]?.parent?.nome}
            </p>
            <p className="mt-1 text-sm font-bold text-green-800">
              Valor: {formatCurrency(reservaAtiva.items?.[0]?.stockItem?.precoVenda || reservaAtiva.items?.[0]?.parent?.precoVenda || 0)}
            </p>
          </div>
        )}

        {/* Busca de Produtos (só aparece na aba produtos) */}
        {abaAtiva === "produtos" && (
        <div className="relative rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">Adicionar Produto</h2>
          <input
            type="text"
            value={searchProd}
            onChange={(e) => { setSearchProd(e.target.value); buscarProdutos(e.target.value); }}
            placeholder="Buscar por nome, SKU, IMEI..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {showProdSearch && prodResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {prodResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                      <p className="text-xs text-gray-500">
                        {p.marca} {p.modelo} | {p.categoria.nome}
                        {p.stockItems.length > 0 && ` | ${p.stockItems.length} em estoque`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {p.precoVenda ? formatCurrency(p.precoVenda) : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Carrinho */}
        <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">
            Carrinho ({cart.filter((i) => i.tipo === "SAIDA").length} itens)
          </h2>

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Carrinho vazio. Adicione produtos.</p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.key} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  item.isLaudo ? "border-blue-200 bg-blue-50" : "border-gray-100"
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {item.isLaudo ? "🔄 " : ""}{item.nome}
                      </p>
                      {item.isLaudo && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Trade-in
                        </span>
                      )}
                    </div>
                    {item.imei && <p className="text-xs text-gray-400">IMEI: {item.imei}</p>}
                    {item.quantidade > 1 && (
                      <p className="text-xs text-gray-400">Qtd: {item.quantidade}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-semibold ${item.precoUnit < 0 ? "text-green-600" : "text-gray-900"}`}>
                      {item.precoUnit < 0 ? "- " : ""}{formatCurrency(Math.abs(item.precoUnit))}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.key)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: Resumo e finalização */}
      <div className="flex w-1/3 flex-col gap-4">
        {/* Cliente */}
        <div className="relative rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-700">Cliente</h2>
          <input
            type="text"
            value={clienteSearch}
            onChange={(e) => buscarCliente(e.target.value)}
            placeholder="Nome ou CPF do cliente..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {showClienteSearch && clienteResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
              {clienteResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selecionarCliente(c)}
                  className="w-full border-b border-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{c.nome}</span>
                  {c.cpf && <span className="ml-2 text-gray-500">{c.cpf}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Laudo / Trade-in */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-gray-700">Trade-in</h2>
            {!laudoVinculado && (
              <button
                onClick={abrirLaudoSelector}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                + Selecionar Laudo
              </button>
            )}
          </div>
          {laudoVinculado ? (
            <div className="mt-2 rounded-lg bg-blue-50 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">{laudoVinculado.aparelhoNome}</p>
                  {laudoVinculado.imei && <p className="text-xs text-blue-600">IMEI: {laudoVinculado.imei}</p>}
                  <p className="text-sm font-bold text-blue-800">
                    - {formatCurrency(laudoVinculado.valorEstimado || 0)}
                  </p>
                </div>
                <button onClick={removerLaudo} className="text-xs text-red-500 hover:text-red-700">
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-400">Nenhum laudo vinculado</p>
          )}
        </div>

        {/* Laudo Selector Modal */}
        {showLaudoSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLaudoSelector(false)}>
            <div className="mx-4 max-h-[70vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Selecionar Laudo Pendente</h2>
              {laudosPendentes.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">Nenhum laudo pendente encontrado</p>
              ) : (
                <div className="space-y-2">
                  {laudosPendentes.map((l: any) => {
                const svc = l.imeiCheck?.services || {};
                const fmiOn = svc.fmi?.data?.fmiOn ?? svc.fmi?.data?.fmiON;
                const blacklisted = svc.blacklist?.data?.gsmaBlacklisted;
                const simUnlocked = svc.simlock?.data?.unlocked;
                return (
                  <button
                    key={l.id}
                    onClick={() => selecionarLaudo(l)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="font-medium text-gray-900">{l.aparelhoNome}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.imei && <span className="text-xs text-gray-500">IMEI: {l.imei}</span>}
                      {l.cliente && <span className="text-xs text-gray-500">Cliente: {l.cliente.nome}</span>}
                    </div>
                    {l.imeiCheck && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          fmiOn === false ? "bg-green-100 text-green-700" : fmiOn === true ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"
                        }`}>
                          iCloud: {fmiOn === false ? "OFF" : fmiOn === true ? "ON" : "..."}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          blacklisted === false ? "bg-green-100 text-green-700" : blacklisted === true ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"
                        }`}>
                          IMEI: {blacklisted === false ? "Limpo" : blacklisted === true ? "BLOQ" : "..."}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          simUnlocked === true ? "bg-green-100 text-green-700" : simUnlocked === false ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"
                        }`}>
                          SIM: {simUnlocked === true ? "Livre" : simUnlocked === false ? "Bloq" : "..."}
                        </span>
                      </div>
                    )}
                    {l.valorEstimado && (
                      <p className="mt-1 text-sm font-semibold text-blue-700">{formatCurrency(l.valorEstimado)}</p>
                    )}
                  </button>
                );
              })}
                </div>
              )}
              <button
                onClick={() => setShowLaudoSelector(false)}
                className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Resumo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {valorLaudo > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Trade-in (desconto)</span>
                <span>- {formatCurrency(valorLaudo)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-gray-600">
              <span>Desconto</span>
              <input
                type="number"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
                step="0.01"
                className="w-24 rounded border border-gray-300 px-2 py-0.5 text-right text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <hr />
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span className={total < 0 ? "text-green-600" : ""}>{formatCurrency(Math.max(0, total))}</span>
            </div>
            {falta > 0 && (
              <div className="flex justify-between text-sm text-red-600 font-medium">
                <span>Falta</span>
                <span>{formatCurrency(falta)}</span>
              </div>
            )}
            {trocoCalculado > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Troco</span>
                <span>{formatCurrency(trocoCalculado)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-xs font-medium text-gray-700">Pagamentos</label>
            {payments.map((pag, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={pag.metodo}
                  onChange={(e) => atualizarPagamento(idx, "metodo", e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="DEBITO">Débito</option>
                  <option value="BOLETO">Boleto</option>
                </select>
                <input
                  type="number"
                  value={pag.valor || ""}
                  onChange={(e) => atualizarPagamento(idx, "valor", parseFloat(e.target.value) || 0)}
                  placeholder="R$ 0,00"
                  step="0.01"
                  className="w-28 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {(pag.metodo === "CREDITO" || pag.metodo === "DEBITO") && (
                  <select
                    value={pag.parcelas}
                    onChange={(e) => atualizarPagamento(idx, "parcelas", parseInt(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>{p}x</option>
                    ))}
                  </select>
                )}
                {payments.length > 1 && (
                  <button onClick={() => removerPagamento(idx)} className="text-xs text-red-500 hover:text-red-700">
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button onClick={adicionarPagamento} className="text-xs font-medium text-blue-600 hover:text-blue-800">
              + Adicionar pagamento
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={finalizarVenda}
          disabled={loading || cart.filter((i) => !i.isLaudo).length === 0}
          className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Finalizando..." : `Finalizar Venda`}
        </button>
      </div>
    </div>
  );
}
