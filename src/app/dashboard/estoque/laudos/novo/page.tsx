"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checklistItems, camposFoto } from "@/lib/checklist";

type Step = 1 | 2 | 3 | 4;

export default function NovoLaudoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [fotoAtiva, setFotoAtiva] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [form, setForm] = useState({
    clienteId: "",
    clienteNome: "",
    clienteCpf: "",
    clienteTelefone: "",
    marca: "",
    modelo: "",
    aparelhoNome: "",
    imei: "",
    serialNumber: "",
    cor: "",
    capacidade: "",
    nivelBateria: "",
    condicao: "COMO_NOVO",
  });

  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<Record<string, string>>({});
  const [valorEstimado, setValorEstimado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [imeiLoading, setImeiLoading] = useState(false);
  const [imeiResult, setImeiResult] = useState<any>(null);

  async function lookupImei() {
    const digits = form.imei.replace(/\D/g, "");
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

      setForm((prev) => ({
        ...prev,
        marca: prev.marca || data.tac?.brand || "",
        modelo: prev.modelo || data.tac?.modelName || svc.detalhes?.data?.model || "",
        aparelhoNome: prev.aparelhoNome || data.tac?.aparelhoNome || svc.detalhes?.data?.description || "",
        cor: prev.cor || svc.detalhes?.data?.color || svc.detalhes?.data?.colour || "",
        capacidade: prev.capacidade || svc.detalhes?.data?.capacity || "",
      }));
    } catch {
      setImeiResult({ error: "Erro ao consultar IMEI" });
    } finally {
      setImeiLoading(false);
    }
  }

  async function buscarCliente() {
    if (!form.clienteCpf) return;
    setBuscandoCliente(true);
    try {
      const res = await fetch(`/api/clientes?cpf=${form.clienteCpf}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm((prev) => ({
            ...prev,
            clienteId: data.id,
            clienteNome: data.nome,
            clienteTelefone: data.telefone || "",
          }));
        }
      }
    } finally {
      setBuscandoCliente(false);
    }
  }

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
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
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

  async function salvarLaudo() {
    setLoading(true);
    setError("");

    try {
      let clienteId = form.clienteId;

      if (!clienteId && form.clienteNome) {
        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: form.clienteNome,
            cpf: form.clienteCpf || null,
            telefone: form.clienteTelefone || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          clienteId = data.id;
        }
      }

      const body = {
        clienteId,
        marca: form.marca,
        modelo: form.modelo,
        aparelhoNome: form.aparelhoNome,
        imei: form.imei || null,
        serialNumber: form.serialNumber || null,
        cor: form.cor || null,
        capacidade: form.capacidade || null,
        nivelBateria: form.nivelBateria || null,
        condicao: form.condicao,
        fotos: Object.keys(fotos).length > 0 ? JSON.stringify(fotos) : null,
        checklistResult: JSON.stringify(checklist),
        acessoriosInclusos: null,
        valorEstimado: valorEstimado || null,
        observacoes: observacoes || null,
      };

      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar laudo");
        setLoading(false);
        return;
      }

      const laudo = await res.json();
      router.push(`/dashboard/estoque/laudos/${laudo.id}`);
    } catch {
      setError("Erro ao salvar laudo");
      setLoading(false);
    }
  }

  const podeAvancar = () => {
    if (step === 1) return form.aparelhoNome.trim() && form.clienteNome.trim();
    if (step === 2) return true;
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Laudo de Inspeção</h1>

        <div className="mt-4 flex items-center gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : step > s
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              <span className={`text-sm ${step === s ? "font-medium text-gray-900" : "text-gray-400"}`}>
                {s === 1 ? "Dados" : s === 2 ? "Fotos" : s === 3 ? "Checklist" : "Finalizar"}
              </span>
              {s < 4 && <div className="h-px w-8 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: DADOS */}
      {step === 1 && (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cliente (vendedor)</h2>
            <p className="text-sm text-gray-500">Quem está vendendo ou trocando o aparelho</p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">CPF</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={form.clienteCpf}
                  onChange={(e) => setForm({ ...form, clienteCpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={buscarCliente}
                  disabled={buscandoCliente}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {buscandoCliente ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input
                type="text"
                value={form.clienteNome}
                onChange={(e) => setForm({ ...form, clienteNome: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="text"
                value={form.clienteTelefone}
                onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })}
                placeholder="(67) 99999-0000"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-lg font-semibold text-gray-900">Aparelho</h2>
            <p className="text-sm text-gray-500">Dados do celular que está sendo avaliado</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Marca</label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                placeholder="Apple"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Modelo</label>
              <input
                type="text"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                placeholder="iPhone 13"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Aparelho *</label>
            <input
              type="text"
              value={form.aparelhoNome}
              onChange={(e) => setForm({ ...form, aparelhoNome: e.target.value })}
              placeholder="iPhone 13 128GB Preto"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                IMEI
                {imeiLoading && <span className="ml-1 text-blue-500">(buscando...)</span>}
              </label>
              <input
                type="text"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                onBlur={lookupImei}
                placeholder="358247111222333"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Serial</label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nível Bateria</label>
              <input
                type="number"
                value={form.nivelBateria}
                onChange={(e) => setForm({ ...form, nivelBateria: e.target.value })}
                placeholder="87"
                min={0}
                max={100}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {imeiResult && !imeiResult.error && (
            <div className="flex flex-wrap gap-3">
              {(() => {
                const svc = imeiResult.services || {};
                const fmiOn = svc.fmi?.data?.fmiOn ?? svc.fmi?.data?.fmiON;
                const blacklisted = svc.blacklist?.data?.gsmaBlacklisted;
                const simUnlocked = svc.simlock?.data?.unlocked;
                return (
                  <>
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
                    {imeiResult.balance && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                        Saldo: ${imeiResult.balance}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {imeiResult?.error && (
            <p className="text-sm text-red-500">{imeiResult.error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cor</label>
              <input
                type="text"
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                placeholder="Preto"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacidade</label>
              <input
                type="text"
                value={form.capacidade}
                onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
                placeholder="128GB"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Condição</label>
            <select
              value={form.condicao}
              onChange={(e) => setForm({ ...form, condicao: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="NOVO">Novo</option>
              <option value="COMO_NOVO">Como Novo (leves sinais de uso)</option>
              <option value="BOM">Bom (desgaste visível)</option>
              <option value="REGULAR">Regular (vários sinais de uso)</option>
            </select>
          </div>
        </div>
      )}

      {/* STEP 2: FOTOS */}
      {step === 2 && (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Fotos do Aparelho</h2>
            <p className="text-sm text-gray-500">Tire 5 fotos usando a câmera</p>
          </div>

          {cameraOpen && (
            <div className="space-y-3 rounded-lg bg-gray-900 p-4">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturarFoto}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Capturar
                </button>
                <button
                  type="button"
                  onClick={fecharCamera}
                  className="rounded-lg bg-gray-600 px-6 py-2 text-sm text-white hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-3">
            {camposFoto.map((campo) => (
              <div key={campo.id} className="text-center">
                <div
                  className={`flex h-28 cursor-pointer items-center justify-center rounded-lg border-2 ${
                    fotos[campo.id]
                      ? "border-green-400 bg-green-50"
                      : "border-dashed border-gray-300 bg-gray-50 hover:border-blue-400"
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
                  <button
                    type="button"
                    onClick={() => {
                      setFotos((prev) => {
                        const next = { ...prev };
                        delete next[campo.id];
                        return next;
                      });
                    }}
                    className="mt-1 text-xs text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {Object.keys(fotos).length} de {camposFoto.length} fotos capturadas
          </p>
        </div>
      )}

      {/* STEP 3: CHECKLIST */}
      {step === 3 && (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Checklist de Inspeção</h2>
            <p className="text-sm text-gray-500">Avalie cada item do aparelho</p>
          </div>

          {checklistItems.map((cat) => (
            <div key={cat.categoria}>
              <h3 className="mb-2 text-sm font-bold uppercase text-gray-700">{cat.categoria}</h3>
              <div className="space-y-1">
                {cat.itens.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <span className="text-sm text-gray-800">{item.label}</span>
                    <div className="flex gap-1">
                      {["OK", "NOK", "NA"].map((opt) => (
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
        </div>
      )}

      {/* STEP 4: FINALIZAR */}
      {step === 4 && (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Finalizar Laudo</h2>
            <p className="text-sm text-gray-500">Defina o valor e observações finais</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor Estimado (R$)</label>
              <input
                type="number"
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
                placeholder="2800"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Condição</label>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {form.condicao === "NOVO" ? "Novo" : form.condicao === "COMO_NOVO" ? "Como Novo" : form.condicao === "BOM" ? "Bom" : "Regular"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Descreva detalhes relevantes sobre o estado do aparelho..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-800">Resumo do Laudo</h3>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>Aparelho: <strong>{form.aparelhoNome}</strong></li>
              {form.imei && <li>IMEI: <strong>{form.imei}</strong></li>}
              {form.cor && <li>Cor: <strong>{form.cor}</strong></li>}
              {form.capacidade && <li>Capacidade: <strong>{form.capacidade}</strong></li>}
              <li>Cliente: <strong>{form.clienteNome}</strong></li>
              <li>Fotos: <strong>{Object.keys(fotos).length}/5</strong></li>
              <li>Checklist: <strong>{Object.values(checklist).filter((v) => v === "OK").length}/{Object.keys(checklist).length} OK</strong></li>
              {Object.values(checklist).filter((v) => v === "NOK").length > 0 && (
                <li className="text-red-600">Itens com problema: <strong>{Object.values(checklist).filter((v) => v === "NOK").length}</strong></li>
              )}
              {checklist.icloud === "OK" && <li className="text-green-600">iCloud: <strong>OFF</strong></li>}
              {checklist.icloud === "NOK" && <li className="text-red-600">iCloud: <strong>ON (bloqueado)</strong></li>}
              {checklist.imei_limpo === "OK" && <li className="text-green-600">IMEI: <strong>Limpo</strong></li>}
              {checklist.imei_limpo === "NOK" && <li className="text-red-600">IMEI: <strong>BLOQUEADO</strong></li>}
              {checklist.operadora === "OK" && <li className="text-green-600">SIM: <strong>Desbloqueado</strong></li>}
              {checklist.operadora === "NOK" && <li className="text-red-600">SIM: <strong>Bloqueado</strong></li>}
              {valorEstimado && <li>Valor estimado: <strong>R$ {parseFloat(valorEstimado).toFixed(2)}</strong></li>}
            </ul>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* NAVEGACAO */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => step > 1 && setStep((step - 1) as Step)}
          disabled={step === 1}
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Voltar
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as Step)}
            disabled={!podeAvancar()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={salvarLaudo}
            disabled={loading}
            className="rounded-lg bg-green-600 px-8 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Laudo como Pendente"}
          </button>
        )}
      </div>
    </div>
  );
}
