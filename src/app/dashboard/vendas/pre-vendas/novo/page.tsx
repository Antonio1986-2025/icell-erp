"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type StepKey = "produto" | "cliente" | "troca" | "valores" | "confirmar";

interface Produto { id: string; nome: string; marca: string | null; modelo: string | null; precoVenda: number | null }
interface Cliente { id: string; nome: string; cpf: string | null }
interface Laudo { id: string; aparelhoNome: string; imei: string | null; marca: string | null; modelo: string | null; valorEstimado: number | null; cliente: { nome: string } | null }

const steps: { key: StepKey; label: string; desc: string }[] = [
  { key: "produto", label: "Produto", desc: "O que está sendo pedido" },
  { key: "cliente", label: "Cliente", desc: "Pra quem é a pré-venda" },
  { key: "troca", label: "Troca", desc: "Usar laudo como pagamento (opcional)" },
  { key: "valores", label: "Valores", desc: "Preço e condições" },
  { key: "confirmar", label: "Confirmar", desc: "Revise e crie" },
];

export default function NovaPreVendaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -- data --
  const [produto, setProduto] = useState<Produto | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [desconto, setDesconto] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // -- product form (step 2) --
  const [prodNome, setProdNome] = useState("");
  const [prodCor, setProdCor] = useState("");
  const [prodCapacidade, setProdCapacidade] = useState("");
  const [prodPreco, setProdPreco] = useState("");
  const [prodCondicao, setProdCondicao] = useState<"NOVO" | "USADO">("NOVO");

  // -- ui state --
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"produto" | "cliente" | null>(null);
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [filtroTroca, setFiltroTroca] = useState("");

  const [prodSearch, setProdSearch] = useState("");
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [prodSearching, setProdSearching] = useState(false);
  const prodSearchTimer = useRef<any>(null);

  const searchTimer = useRef<any>(null);

  // -- computed --
  const subtotal = parseFloat(prodPreco || "0");
  const valorTroca = laudo?.valorEstimado || 0;
  const valorDesconto = parseFloat(desconto || "0");
  const total = subtotal - valorTroca - valorDesconto;

  // -- navigation --
  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function back() { if (step > 0) setStep(step - 1); }

  // -- product search --
  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return; }
    if (prodSearchTimer.current) clearTimeout(prodSearchTimer.current);
    prodSearchTimer.current = setTimeout(async () => {
      setProdSearching(true);
      try {
        const r = await fetch(`/api/produtos?search=${encodeURIComponent(prodSearch.trim())}`);
        if (r.ok) {
          const data = await r.json();
          setProdResults(data.produtos || []);
        }
      } catch {}
      setProdSearching(false);
    }, 300);
  }, [prodSearch]);

  // -- search --
  useEffect(() => {
    if (steps[step].key === "troca") {
      fetch("/api/laudos?status=PENDENTE")
        .then((r) => r.json())
        .then((d) => setLaudos(d || []))
        .catch(() => {});
    }
  }, [step]);

  function handleSearch(q: string) {
    setBusca(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!q.trim()) { setResultados([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const key = steps[step].key;
      try {
        if (key === "cliente") {
          const r = await fetch(`/api/clientes?search=${encodeURIComponent(q)}`);
          if (r.ok) setResultados(await r.json());
        }
      } catch {}
      setSearching(false);
    }, 300);
  }

  function selecionarCliente(c: Cliente) {
    setCliente(c);
    setBusca(c.nome);
    setResultados([]);
    next();
  }

  function selecionarLaudo(l: Laudo) {
    setLaudo(l);
    next();
  }

  // -- modals --
  function abrirModal(tipo: "produto" | "cliente") {
    setModalType(tipo);
    setShowModal(true);
  }

  async function salvarProduto(form: { nome: string; marca: string; modelo: string; precoVenda?: number | null; tipo?: string }) {
    const rCat = await fetch("/api/categorias");
    const catData = await rCat.json();
    const cats = catData.categorias || catData || [];
    const categoriaId = cats.find((c: any) => c.nome?.toLowerCase().includes("celular"))?.id || cats[0]?.id;

    const r = await fetch("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoriaId: categoriaId || "",
        nome: form.nome,
        marca: form.marca || null,
        modelo: form.modelo || null,
        tipo: form.tipo || "NOVO",
        precoVenda: form.precoVenda ?? null,
      }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "Erro");
    const data = await r.json();
    return data.produto;
  }

  // -- submit --
  async function criarPreVenda() {
    setLoading(true);
    setError("");

    const items: any[] = produto?.id
      ? [{ parentId: produto.id, tipo: "SAIDA", quantidade: 1, precoUnit: subtotal }]
      : [];

    try {
      const r = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: cliente?.id || null,
          items,
          desconto: valorDesconto || 0,
          laudoId: laudo?.id || null,
          status: "PRE_VENDA",
          observacoes: observacoes || `Pré-venda`,
          cor: prodCor || null,
          capacidade: prodCapacidade || null,
          condicao: prodCondicao,
        }),
      });

      if (!r.ok) { const d = await r.json(); setError(d.error || "Erro"); setLoading(false); return; }
      router.push("/dashboard/vendas/pre-vendas");
    } catch { setError("Erro ao criar pré-venda"); setLoading(false); }
  }

  // -- render current step --
  function renderStep() {
    const key = steps[step].key;

    // ============== PRODUTO ==============
    if (key === "produto") {

      function selecionarProdutoExistente(p: any) {
        setProduto(p);
        setProdNome(p.nome);
        setProdPreco(p.precoVenda?.toString() || "");
      }

      async function salvarEAvancar() {
        if (!prodNome.trim()) return;
        const p = await salvarProduto({
          nome: prodNome.trim(),
          marca: "",
          modelo: "",
          precoVenda: parseFloat(prodPreco) || null,
          tipo: prodCondicao,
        });
        setProduto(p);
        next();
      }

      return (
        <div>
          {produto ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">{produto.nome}</p>
                  <div className="mt-1 text-xs text-green-600">
                    {prodCor && <span>Cor: {prodCor} | </span>}
                    {prodCapacidade && <span>Cap: {prodCapacidade} | </span>}
                    <span>Cond: {prodCondicao}</span>
                  </div>
                </div>
                <button onClick={() => { setProduto(null); setProdNome(""); setProdCor(""); setProdCapacidade(""); setProdPreco(""); }}
                  className="text-xs text-red-500 hover:underline"
                >Trocar</button>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={next} className="rounded-lg bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700">
                  Avançar →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Buscar produto existente</label>
                <input type="text" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Digite para buscar no catálogo..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                {prodSearching && <p className="mt-1 text-xs text-gray-400">Buscando...</p>}
                {prodResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white shadow">
                    {prodResults.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => selecionarProdutoExistente(p)}
                        className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                        <div className="text-xs text-gray-500">
                          {p.marca && <span>{p.marca} </span>}
                          {p.precoVenda && <span>| {formatCurrency(p.precoVenda)}</span>}
                          {p.stockItems?.length > 0 && <span> | {p.stockItems.length} em estoque</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">OU crie um novo</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Aparelho</label>
                <input type="text" value={prodNome} onChange={(e) => setProdNome(e.target.value)}
                  placeholder="Ex: iPhone 16 Pro Max"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cor</label>
                  <input type="text" value={prodCor} onChange={(e) => setProdCor(e.target.value)}
                    placeholder="Ex: Branco"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacidade</label>
                  <input type="text" value={prodCapacidade} onChange={(e) => setProdCapacidade(e.target.value)}
                    placeholder="Ex: 256GB"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Preço de Venda (R$) *</label>
                <input type="number" value={prodPreco} onChange={(e) => setProdPreco(e.target.value)}
                  placeholder="0,00" step="0.01"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Condição</label>
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => setProdCondicao("NOVO")}
                    className={`flex-1 rounded-lg py-3 text-sm font-bold transition-all ${
                      prodCondicao === "NOVO"
                        ? "bg-green-600 text-white shadow-md"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >🆕 NOVO</button>
                  <button type="button" onClick={() => setProdCondicao("USADO")}
                    className={`flex-1 rounded-lg py-3 text-sm font-bold transition-all ${
                      prodCondicao === "USADO"
                        ? "bg-amber-500 text-white shadow-md"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >🔄 USADO</button>
                </div>
                {prodCondicao === "USADO" && (
                  <p className="mt-2 text-xs text-amber-600">
                    ⚠️ Produto USADO — na finalização abrirá o checklist de inspeção.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={back} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  ← Voltar
                </button>
                <button onClick={salvarEAvancar} disabled={!prodNome.trim() || !prodPreco || parseFloat(prodPreco) <= 0}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >Salvar e Avançar →</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ============== CLIENTE ==============
    if (key === "cliente") {
      return (
        <div>
          {cliente ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">{cliente.nome}</p>
                  {cliente.cpf && <p className="text-xs text-green-600">{cliente.cpf}</p>}
                </div>
                <button onClick={() => { setCliente(null); setBusca(""); }} className="text-xs text-red-500 hover:underline">
                  Trocar
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={next} className="rounded-lg bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700">
                  Avançar →
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={busca}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar cliente por nome ou CPF..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />

              {searching && <p className="mt-2 text-xs text-gray-400">Buscando...</p>}

              {resultados.length > 0 && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow">
                  {resultados.map((c: any) => (
                    <button key={c.id} onClick={() => selecionarCliente(c)}
                      className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                      {c.cpf && <p className="text-xs text-gray-500">{c.cpf}</p>}
                    </button>
                  ))}
                </div>
              )}

              {busca.trim() && resultados.length === 0 && !searching && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Nenhum cliente encontrado para "{busca}"</p>
                  <button onClick={() => abrirModal("cliente")}
                    className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                  >Cadastrar novo cliente →</button>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // ============== TROCA ==============
    if (key === "troca") {
      const filtrados = laudos.filter((l) =>
        !filtroTroca.trim() ||
        l.aparelhoNome.toLowerCase().includes(filtroTroca.toLowerCase()) ||
        (l.imei && l.imei.includes(filtroTroca)) ||
        (l.cliente?.nome && l.cliente.nome.toLowerCase().includes(filtroTroca.toLowerCase()))
      );

      return (
        <div>
          {laudo ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">{laudo.aparelhoNome}</p>
                  {laudo.imei && <p className="text-xs text-green-600">IMEI: {laudo.imei}</p>}
                  <p className="mt-1 text-lg font-bold text-green-800">{formatCurrency(laudo.valorEstimado || 0)}</p>
                </div>
                <button onClick={() => setLaudo(null)} className="text-xs text-red-500 hover:underline">
                  Remover
                </button>
              </div>
              <div className="mt-4 flex justify-between">
                <button onClick={back} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  ← Voltar
                </button>
                <button onClick={next} className="rounded-lg bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700">
                  Confirmar →
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={filtroTroca}
                onChange={(e) => setFiltroTroca(e.target.value)}
                placeholder="Filtrar por aparelho, IMEI ou cliente..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />

              <p className="mt-2 text-xs text-gray-400">{filtrados.length} laudo{filtrados.length !== 1 ? "s" : ""} pendente{filtrados.length !== 1 ? "s" : ""}</p>

              {laudos.length === 0 ? (
                <p className="mt-4 text-center text-sm text-gray-500">Nenhum laudo pendente disponível</p>
              ) : (
                <div className="mt-2 max-h-64 overflow-auto space-y-2">
                  {filtrados.map((l) => (
                    <button key={l.id} onClick={() => selecionarLaudo(l)}
                      className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                    >
                      <p className="font-medium text-gray-900">{l.aparelhoNome}</p>
                      <div className="mt-1 text-xs text-gray-500">
                        {l.imei && <span>IMEI: {l.imei} | </span>}
                        {l.cliente?.nome && <span>Cliente: {l.cliente.nome}</span>}
                      </div>
                      {l.valorEstimado && <p className="mt-1 text-sm font-semibold text-blue-700">{formatCurrency(l.valorEstimado)}</p>}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-between">
                <button onClick={back} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  ← Voltar
                </button>
                <button onClick={next} className="rounded-lg border border-blue-600 px-6 py-2 text-sm text-blue-700 hover:bg-blue-50">
                  Pular →
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    // ============== VALORES ==============
    if (key === "valores") {
      return (
        <div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Desconto (R$)</label>
              <input type="number" value={desconto} onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00" step="0.01"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Observações</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações sobre o pedido..." rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Produto ({produto?.nome})</span><span>{formatCurrency(subtotal)}</span></div>
              {valorTroca > 0 && <div className="flex justify-between text-blue-600"><span>Troca</span><span>-{formatCurrency(valorTroca)}</span></div>}
              {valorDesconto > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>-{formatCurrency(valorDesconto)}</span></div>}
              <hr />
              <div className="flex justify-between text-lg font-bold text-gray-900"><span>Total</span><span>{formatCurrency(Math.max(0, total))}</span></div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={back} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">← Voltar</button>
            <button onClick={next}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
            >Revisar →</button>
          </div>
        </div>
      );
    }

    // ============== CONFIRMAR ==============
    if (key === "confirmar") {
      return (
        <div>
          <div className="space-y-3">
            <ResumoCard titulo="Produto" cor="gray">
              <p className="text-sm font-medium text-gray-900">{produto?.nome || "—"}</p>
              <div className="mt-1 text-xs text-gray-500">
                {produto?.marca && <span>{produto.marca} </span>}
                {prodCor && <span>Cor: {prodCor} | </span>}
                {prodCapacidade && <span>Cap: {prodCapacidade} | </span>}
                <span className={prodCondicao === "USADO" ? "text-amber-600 font-medium" : "text-green-600"}>
                  {prodCondicao === "NOVO" ? "🆕 NOVO" : "🔄 USADO"}
                </span>
              </div>
            </ResumoCard>
            <ResumoCard titulo="Cliente" cor="gray">
              <p className="text-sm font-medium text-gray-900">{cliente?.nome || "—"}</p>
              {cliente?.cpf && <p className="text-xs text-gray-500">{cliente.cpf}</p>}
            </ResumoCard>
            {laudo && (
              <ResumoCard titulo="Troca" cor="blue">
                <p className="text-sm font-medium text-blue-900">{laudo.aparelhoNome}</p>
                <p className="text-sm font-bold text-blue-800">{formatCurrency(laudo.valorEstimado || 0)}</p>
              </ResumoCard>
            )}
            <ResumoCard titulo="Valores" cor="gray">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Preço</span><span>{formatCurrency(subtotal)}</span></div>
                {valorDesconto > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>-{formatCurrency(valorDesconto)}</span></div>}
                <hr />
                <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(Math.max(0, total))}</span></div>
              </div>
            </ResumoCard>
            {observacoes && (
              <ResumoCard titulo="Observações" cor="amber">
                <p className="text-sm text-amber-800">{observacoes}</p>
              </ResumoCard>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-between">
            <button onClick={back} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">← Voltar</button>
            <button onClick={criarPreVenda} disabled={loading}
              className="rounded-lg bg-green-600 px-8 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >{loading ? "Criando..." : "✅ Criar Pré-Venda"}</button>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/vendas/pre-vendas" className="text-sm text-blue-600 hover:underline">
        ← Voltar para pré-vendas
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">Nova Pré-Venda</h1>

      {/* Steps */}
      <div className="mt-6">
        <div className="flex items-center gap-0.5">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-0.5 flex-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                idx === step ? "bg-blue-600 text-white" : idx < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
                  {idx < step ? "✓" : idx + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < steps.length - 1 && <div className={`h-px flex-1 ${idx < step ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">{steps[step].desc}</p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
        {renderStep()}
      </div>

      {/* Modal de cadastro */}
      {showModal && modalType && (
        <ModalCadastro
          tipo={modalType}
          nomeInicial={modalType === "produto" ? prodNome : ""}
          marcaInicial={modalType === "produto" ? "" : ""}
          modeloInicial={modalType === "produto" ? "" : ""}
          onClose={() => setShowModal(false)}
          onConfirm={async (dados) => {
            try {
              let item;
              if (modalType === "produto") {
                item = await salvarProduto(dados as any);
                setProduto(item);
                if (item.precoVenda) setProdPreco(item.precoVenda.toString());
                setShowModal(false);
                next();
              } else if (modalType === "cliente") {
                const r = await fetch("/api/clientes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nome: (dados as any).nome, cpf: (dados as any).cpf || null, telefone: (dados as any).telefone || null }),
                });
                if (!r.ok) throw new Error("Erro");
                item = await r.json();
                setCliente(item);
                setShowModal(false);
                next();
              }
            } catch (e: any) {
              setError(e.message || "Erro ao cadastrar");
            }
          }}
        />
      )}
    </div>
  );
}

// -- helper components --
function ResumoCard({ titulo, cor, children }: { titulo: string; cor: "gray" | "blue" | "amber"; children: React.ReactNode }) {
  const border = cor === "blue" ? "border-blue-200" : cor === "amber" ? "border-amber-200" : "border-gray-200";
  const text = cor === "blue" ? "text-blue-600" : cor === "amber" ? "text-amber-600" : "text-gray-500";
  return (
    <div className={`rounded-lg border ${border} p-4`}>
      <h3 className={`text-xs font-bold uppercase ${text}`}>{titulo}</h3>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// -- modal --
function ModalCadastro({ tipo, nomeInicial, marcaInicial, modeloInicial, onClose, onConfirm }: {
  tipo: "produto" | "cliente";
  nomeInicial?: string;
  marcaInicial?: string;
  modeloInicial?: string;
  onClose: () => void;
  onConfirm: (dados: any) => Promise<void>;
}) {
  const [nome, setNome] = useState(nomeInicial || "");
  const [extra1, setExtra1] = useState("");
  const [extra2, setExtra2] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const titles = { produto: "Novo Produto", cliente: "Novo Cliente" };
  const fields: Record<string, { label: string; placeholder: string; key: string }[]> = {
    produto: [
      { label: "Nome *", placeholder: "Nome do produto", key: "nome" },
      { label: "Marca", placeholder: "Ex: Apple, Samsung", key: "marca" },
      { label: "Modelo", placeholder: "Ex: iPhone 16 Pro Max", key: "modelo" },
    ],
    cliente: [
      { label: "Nome *", placeholder: "Nome do cliente", key: "nome" },
      { label: "CPF", placeholder: "000.000.000-00", key: "cpf" },
      { label: "Telefone", placeholder: "(11) 99999-9999", key: "telefone" },
    ],
  };

  const myFields = fields[tipo];

  async function handleSubmit() {
    if (!nome.trim()) { setErr("Nome é obrigatório"); return; }
    setSaving(true);
    setErr("");

    const dados: any = { nome: nome.trim() };
    if (tipo === "produto") {
      dados.marca = extra1;
      dados.modelo = extra2;
    } else if (tipo === "cliente") {
      dados.cpf = extra1;
      dados.telefone = extra2;
    }

    try {
      await onConfirm(dados);
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{titles[tipo]}</h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">{myFields[0].label}</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder={myFields[0].placeholder}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{myFields[1].label}</label>
            <input type="text" value={extra1} onChange={(e) => setExtra1(e.target.value)}
              placeholder={myFields[1].placeholder}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{myFields[2].label}</label>
            <input type="text" value={extra2} onChange={(e) => setExtra2(e.target.value)}
              placeholder={myFields[2].placeholder}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
