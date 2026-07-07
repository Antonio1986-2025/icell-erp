"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { checklistItems, camposFoto } from "@/lib/checklist";

type InspecaoStep = 1 | 2 | 3;

export default function ReceberPreVendaPage() {
  const params = useParams();
  const router = useRouter();
  const [preVenda, setPreVenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [cor, setCor] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [nivelBateria, setNivelBateria] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [condicao, setCondicao] = useState("NOVO");

  const [inspecaoStep, setInspecaoStep] = useState<InspecaoStep>(1);
  const [checklist, setChecklist] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [valorEstimado, setValorEstimado] = useState("");
  const [observacoesLaudo, setObservacoesLaudo] = useState("");

  const [imeiLoading, setImeiLoading] = useState(false);
  const [imeiResult, setImeiResult] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function parseObs(obs: string | null) {
    if (!obs) return {};
    const parts = obs.split("|").map((s) => s.trim());
    const cor = parts.find((p) => p.startsWith("COR:"))?.replace("COR:", "") || "";
    const cap = parts.find((p) => p.startsWith("CAP:"))?.replace("CAP:", "") || "";
    const cond = parts.find((p) => p.startsWith("COND:"))?.replace("COND:", "") || "";
    return { cor, capacidade: cap, condicao: cond };
  }

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/vendas/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPreVenda(data);
          const dados = parseObs(data.observacoes);
          if (dados.cor) setCor(dados.cor);
          if (dados.capacidade) setCapacidade(dados.capacidade);
          if (dados.condicao) setCondicao(dados.condicao);
          if (data.custoTotal > 0) setPrecoCusto(data.custoTotal.toString());
          if (data.prazoEntregaDias) {
            setObservacoesLaudo((prev) => `Prazo de entrega: ${data.prazoEntregaDias} dias`);
          }
        } else {
          setPreVenda(null);
        }
      } catch {
        setPreVenda(null);
      }
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  const isUsado = condicao === "USADO" || condicao === "COMO_NOVO" || condicao === "BOM" || condicao === "REGULAR";

  async function abrirCamera(campoId: string) {
    setFotoAtiva(campoId);
    setCameraOpen(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Não foi possível acessar a câmera.");
      setCameraOpen(false);
    }
  }

  function capturarFoto() {
    if (!videoRef.current || !canvasRef.current || !fotoAtiva) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setFotos((prev) => ({ ...prev, [fotoAtiva]: dataUrl }));
    fecharCamera();
  }

  function fecharCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setFotoAtiva(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function setChecklistItem(id: string, value: string) {
    setChecklist((prev) => ({ ...prev, [id]: value }));
  }

  async function lookupImei() {
    const digits = imei.replace(/\D/g, "");
    if (digits.length < 8) return;
    setImeiLoading(true);
    setImeiResult(null);
    try {
      const res = await fetch(`/api/imei/check?imei=${digits}`);
      const data = await res.json();

      if (data.error) {
        setImeiResult({ error: data.error });
        return;
      }

      setImeiResult(data);

      const svc = data.services || {};

      const fmiOn = svc.fmi?.data?.fmiOn ?? svc.fmi?.data?.fmiON;
      const blacklisted = svc.blacklist?.data?.gsmaBlacklisted;
      const simUnlocked = svc.simlock?.data?.unlocked;

      setChecklist((prev) => ({
        ...prev,
        icloud: fmiOn === false ? "OK" : fmiOn === true ? "NOK" : prev.icloud || "",
        imei_limpo: blacklisted === false ? "OK" : blacklisted === true ? "NOK" : prev.imei_limpo || "",
        operadora: simUnlocked === true ? "OK" : simUnlocked === false ? "NOK" : prev.operadora || "",
      }));

      setCor((prev) => prev || svc.detalhes?.data?.color || svc.detalhes?.data?.colour || "");
      setCapacidade((prev) => prev || svc.detalhes?.data?.capacity || "");
    } catch {
      setImeiResult({ error: "Erro ao consultar IMEI" });
    } finally {
      setImeiLoading(false);
    }
  }

  const checklistCompleto = Object.keys(checklist).length >= checklistItems.reduce((s, c) => s + c.itens.length, 0);

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!preVenda) return <p className="mt-8 text-center text-sm text-red-600">Pré-venda não encontrada</p>;

  const laudoData = preVenda.inspectionReports?.[0];

  async function finalizar() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/vendas/${params.id}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RECEBIDA",
          imei: imei.replace(/\D/g, ""),
          serialNumber: serial,
          cor,
          capacidade,
          nivelBateria: nivelBateria || null,
          precoCusto: precoCusto || null,
          condicao,
          inspectionChecklist: isUsado ? JSON.stringify(checklist) : null,
          inspectionFotos: isUsado && Object.keys(fotos).length > 0 ? JSON.stringify(fotos) : null,
          inspectionValor: isUsado && valorEstimado ? parseFloat(valorEstimado) : null,
          inspectionObservacoes: isUsado ? observacoesLaudo : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao finalizar");
        setSaving(false);
        return;
      }

      router.push("/dashboard/vendas/pre-vendas");
    } catch {
      setError("Erro ao finalizar pré-venda");
      setSaving(false);
    }
  }

  const totalItensChecklist = checklistItems.reduce((s, c) => s + c.itens.length, 0);
  const itensOk = Object.values(checklist).filter((v) => v === "OK").length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/vendas/pre-vendas" className="text-sm text-blue-600 hover:underline">
        ← Voltar para pré-vendas
      </Link>

      <div className="mt-4 space-y-6">
        {/* Info da Pré-Venda */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-amber-900">Receber Produto — Pré-Venda #{preVenda.numero}</h1>
          <p className="mt-1 text-sm text-amber-700">Criada em {formatDateTime(preVenda.createdAt)}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-amber-800">
            <div><span className="font-medium">Cliente:</span> {preVenda.cliente?.nome || "—"}</div>
            <div><span className="font-medium">CPF:</span> {preVenda.cliente?.cpf || "—"}</div>
            <div><span className="font-medium">Fornecedor:</span> {preVenda.fornecedor?.nome || "—"}</div>
            <div><span className="font-medium">Produto:</span> {preVenda.items?.[0]?.parent?.nome || "—"}</div>
            <div><span className="font-medium">Valor Custo:</span> {formatCurrency(preVenda.custoTotal)}</div>
            <div><span className="font-medium">Prazo Entrega:</span> {preVenda.prazoEntregaDias ? `${preVenda.prazoEntregaDias} dias` : "—"}</div>
          </div>

          {laudoData && (
            <div className="mt-3 rounded-lg bg-amber-100 p-3">
              <p className="text-sm font-medium text-amber-800">Troca: {laudoData.aparelhoNome}</p>
              <p className="text-sm text-amber-700">Valor: -{formatCurrency(laudoData?.valorEstimado || 0)}</p>
              <Link href={`/dashboard/estoque/laudos/${laudoData.id}`} className="text-xs text-amber-600 hover:underline">
                Ver laudo →
              </Link>
            </div>
          )}
        </div>

        {/* Banner USADO com step indicator */}
        {isUsado && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-bold text-blue-900">Produto {condicao} — Faça a inspeção</p>
                <p className="text-sm text-blue-700">
                  Preencha o checklist abaixo para gerar o laudo automaticamente na finalização.
                  {itensOk > 0 && ` ${itensOk}/${totalItensChecklist} itens OK`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dados do Produto Recebido */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">1. Dados do Aparelho</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                IMEI *
                {imeiLoading && <span className="ml-2 text-blue-500">(consultando...)</span>}
              </label>
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                onBlur={lookupImei}
                placeholder="Digite o IMEI"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {imeiResult && !imeiResult.error && (() => {
                const svc = imeiResult.services || {};
                const fmiOn = svc.fmi?.data?.fmiOn ?? svc.fmi?.data?.fmiON;
                const blacklisted = svc.blacklist?.data?.gsmaBlacklisted;
                const simUnlocked = svc.simlock?.data?.unlocked;
                return (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${fmiOn === false ? "bg-green-100 text-green-700" : fmiOn === true ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`h-2 w-2 rounded-full ${fmiOn === false ? "bg-green-500" : fmiOn === true ? "bg-red-500" : "bg-gray-400"}`} />
                      iCloud: {fmiOn === false ? "OFF" : fmiOn === true ? "ON" : "..."}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${blacklisted === false ? "bg-green-100 text-green-700" : blacklisted === true ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`h-2 w-2 rounded-full ${blacklisted === false ? "bg-green-500" : blacklisted === true ? "bg-red-500" : "bg-gray-400"}`} />
                      Blacklist: {blacklisted === false ? "Limpo" : blacklisted === true ? "BLOQUEADO" : "..."}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${simUnlocked === true ? "bg-green-100 text-green-700" : simUnlocked === false ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`h-2 w-2 rounded-full ${simUnlocked === true ? "bg-green-500" : simUnlocked === false ? "bg-red-500" : "bg-gray-400"}`} />
                      SIM: {simUnlocked === true ? "Desbloqueado" : simUnlocked === false ? "Bloqueado" : "..."}
                    </span>
                  </div>
                );
              })()}
              {imeiResult?.error && (
                <p className="mt-1 text-sm text-red-500">{imeiResult.error}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Serial</label>
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Número de série"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cor</label>
              <input
                type="text"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder="Ex: Preto"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacidade</label>
              <input
                type="text"
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
                placeholder="Ex: 256GB"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nível Bateria (%)</label>
              <input
                type="number"
                value={nivelBateria}
                onChange={(e) => setNivelBateria(e.target.value)}
                placeholder="100"
                min={0}
                max={100}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Custo (R$)</label>
              <input
                type="number"
                value={precoCusto}
                onChange={(e) => setPrecoCusto(e.target.value)}
                placeholder="Quanto você pagou"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Condição</label>
              <select
                value={condicao}
                onChange={(e) => setCondicao(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="NOVO">Novo</option>
                <option value="COMO_NOVO">Como Novo</option>
                <option value="BOM">Bom</option>
                <option value="REGULAR">Regular</option>
                <option value="USADO">Usado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Checklist de Inspeção (só para USADO) */}
        {isUsado && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase text-gray-700">2. Checklist de Inspeção</h2>
              <div className="flex items-center gap-0.5">
                {([1, 2, 3] as InspecaoStep[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setInspecaoStep(s)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      inspecaoStep === s
                        ? "bg-blue-600 text-white"
                        : inspecaoStep > s
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {inspecaoStep > s ? "✓" : s === 1 ? "Check" : s === 2 ? "Fotos" : "Valor"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-xs text-center">
              <span className="text-base leading-none text-gray-400">ℹ</span>
              <span>
                <strong className="text-green-700">OK</strong>
                <span className="text-gray-500"> = Bom / Funcionando</span>
                <span className="mx-2 text-gray-300">|</span>
                <strong className="text-red-700">NOK</strong>
                <span className="text-gray-500"> = Com problema</span>
                <span className="mx-2 text-gray-300">|</span>
                <strong className="text-gray-500">NA</strong>
                <span className="text-gray-500"> = Não se aplica</span>
              </span>
            </div>

            {/* STEP 1: CHECKLIST */}
            {inspecaoStep === 1 && (
              <div className="space-y-4">
                {checklistItems.map((cat) => (
                  <div key={cat.categoria}>
                    <h3 className="mb-2 text-sm font-bold uppercase text-gray-700">{cat.categoria}</h3>
                    <div className="space-y-1">
                      {cat.itens.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                          <span className="text-sm text-gray-800">{item.label}</span>
                          <div className="flex gap-1">
                            {(["OK", "NOK", "NA"] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setChecklistItem(item.id, opt)}
                                className={`min-w-[40px] rounded-md px-2 py-1 text-xs font-bold transition ${
                                  checklist[item.id] === opt
                                    ? opt === "OK"
                                      ? "bg-green-100 text-green-700 ring-2 ring-green-400"
                                      : opt === "NOK"
                                        ? "bg-red-100 text-red-700 ring-2 ring-red-400"
                                        : "bg-gray-100 text-gray-500 ring-2 ring-gray-400"
                                    : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setInspecaoStep(2)}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Avançar → Fotos
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FOTOS */}
            {inspecaoStep === 2 && (
              <div className="space-y-4">
                {cameraOpen && (
                  <div className="space-y-3 rounded-lg bg-gray-900 p-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2">
                      <button type="button" onClick={capturarFoto} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700">
                        Capturar
                      </button>
                      <button type="button" onClick={fecharCamera} className="rounded-lg bg-gray-600 px-6 py-2 text-sm text-white hover:bg-gray-700">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-5 gap-3">
                  {camposFoto.map((campo) => (
                    <div key={campo.id} className="text-center">
                      <div
                        className={`flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 ${
                          fotos[campo.id] ? "border-green-400 bg-green-50" : "border-dashed border-gray-300 bg-gray-50 hover:border-blue-400"
                        }`}
                        onClick={() => abrirCamera(campo.id)}
                      >
                        {fotos[campo.id] ? (
                          <img src={fotos[campo.id]} alt={campo.label} className="h-full w-full rounded-lg object-cover" />
                        ) : (
                          <div className="text-center text-gray-400">
                            <p className="text-2xl">📷</p>
                            <p className="mt-1 text-xs">{campo.label}</p>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-gray-600">{campo.label}</p>
                      {fotos[campo.id] && (
                        <button type="button" onClick={() => setFotos((prev) => { const n = { ...prev }; delete n[campo.id]; return n; })}
                          className="mt-1 text-xs text-red-500 hover:underline"
                        >Remover</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setInspecaoStep(1)} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    ← Voltar
                  </button>
                  <button type="button" onClick={() => setInspecaoStep(3)} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700">
                    Avançar → Valor
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: VALOR ESTIMADO */}
            {inspecaoStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    placeholder="Ex: 2800"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-blue-800">Resumo da Inspeção</h3>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li>Itens OK: <strong>{itensOk}/{totalItensChecklist}</strong></li>
                    <li>Itens com problema: <strong>{Object.values(checklist).filter((v) => v === "NOK").length}</strong></li>
                    {checklist.icloud === "OK" && <li className="text-green-600">iCloud: <strong>OFF</strong></li>}
                    {checklist.icloud === "NOK" && <li className="text-red-600">iCloud: <strong>ON (bloqueado)</strong></li>}
                    {checklist.imei_limpo === "OK" && <li className="text-green-600">IMEI: <strong>Limpo</strong></li>}
                    {checklist.imei_limpo === "NOK" && <li className="text-red-600">IMEI: <strong>BLOQUEADO</strong></li>}
                    <li>Fotos: <strong>{Object.keys(fotos).length}/{camposFoto.length}</strong></li>
                    {valorEstimado && <li>Valor estimado: <strong>{formatCurrency(parseFloat(valorEstimado))}</strong></li>}
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações do Laudo</label>
                  <textarea
                    value={observacoesLaudo}
                    onChange={(e) => setObservacoesLaudo(e.target.value)}
                    rows={3}
                    placeholder="Descreva detalhes relevantes sobre o estado do aparelho..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setInspecaoStep(2)} className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    ← Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={finalizar}
          disabled={saving || !imei.trim()}
          className="w-full rounded-lg bg-green-600 py-3 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "📦 Receber Produto"}
        </button>
      </div>
    </div>
  );
}
