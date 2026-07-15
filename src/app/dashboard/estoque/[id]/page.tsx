"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const condicaoLabels: Record<string, string> = {
  NOVO: "Novo",
  COMO_NOVO: "Como Novo",
  BOM: "Bom",
  REGULAR: "Regular",
  RUIM: "Ruim",
};

const statusLabels: Record<string, string> = {
  EM_ESTOQUE: "Em Estoque",
  VENDIDO: "Vendido",
  RESERVADO: "Reservado",
};

const statusColors: Record<string, string> = {
  EM_ESTOQUE: "bg-green-100 text-green-700",
  VENDIDO: "bg-blue-100 text-blue-700",
  RESERVADO: "bg-yellow-100 text-yellow-700",
};

export default function EstoqueDetalhePage() {
  const params = useParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    async function carregar() {
      const res = await fetch(`/api/estoque/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setItem(data);
        setFormData({
          precoVenda: data.precoVenda ?? "",
          dataFimGarantia: data.dataFimGarantia
            ? new Date(data.dataFimGarantia).toISOString().split("T")[0]
            : "",
          observacoes: data.observacoes ?? "",
          condicao: data.condicao ?? "",
          acessoriosInclusos: data.acessoriosInclusos ?? "",
        });
      }
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch(`/api/estoque/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar");
        return;
      }
      const atualizado = await res.json();
      setItem((prev: any) => ({ ...prev, ...atualizado }));
      setEditando(false);
    } catch {
      alert("Erro de conexão ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!item) return <p className="mt-8 text-center text-sm text-red-600">Item não encontrado</p>;

  const laudo = item.inspectionReports?.[0];
  const fotos = laudo?.fotos ? JSON.parse(laudo.fotos) : {};
  const checklist = laudo?.checklistResult ? JSON.parse(laudo.checklistResult) : {};
  const transacaoEntrada = item.transactionItems?.find((ti: any) => ti.transacao?.tipo === "TRADE_IN")?.transacao;
  const transacaoVenda = item.transactionItems?.find((ti: any) => ti.transacao?.tipo === "VENDA")?.transacao;
  const totalItens = Object.keys(checklist).length;
  const okItens = Object.values(checklist).filter((v) => v === "OK").length;

  const camposFoto = [
    { id: "frente", label: "Frente" },
    { id: "verso", label: "Verso" },
    { id: "lateral_esq", label: "Lateral Esq." },
    { id: "lateral_dir", label: "Lateral Dir." },
    { id: "imei_tela", label: "IMEI na Tela" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/estoque" className="text-sm text-blue-600 hover:underline">
        ← Voltar para estoque
      </Link>

      <div className="mt-4 space-y-6">
        {/* CABECALHO */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{item.parent?.nome || "Produto"}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {item.parent?.marca && `${item.parent.marca} `}{item.parent?.modelo || ""}
                {item.cor && ` — ${item.cor}`}{item.capacidade && ` — ${item.capacidade}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!editando && item.status === "EM_ESTOQUE" && (
                <button
                  onClick={() => setEditando(true)}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                >
                  ✏️ Editar
                </button>
              )}
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusColors[item.status] || "bg-gray-100 text-gray-600"}`}>
                {statusLabels[item.status] || item.status}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {item.imei && (
              <div className="col-span-2">
                <span className="text-gray-500">IMEI:</span>
                <span className="ml-1 font-mono font-medium">{item.imei}</span>
              </div>
            )}
            {item.serialNumber && <div><span className="text-gray-500">Serial:</span> <span className="font-medium">{item.serialNumber}</span></div>}

            {/* CONDIÇÃO — editável */}
            {editando ? (
              <div>
                <label className="text-gray-500">Condição:</label>
                <select
                  value={formData.condicao || ""}
                  onChange={(e) => setFormData((f: any) => ({ ...f, condicao: e.target.value }))}
                  className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="NOVO">Novo</option>
                  <option value="COMO_NOVO">Como Novo</option>
                  <option value="BOM">Bom</option>
                  <option value="REGULAR">Regular</option>
                  <option value="RUIM">Ruim</option>
                </select>
              </div>
            ) : (
              <div><span className="text-gray-500">Condição:</span> <span className="font-medium">{condicaoLabels[item.condicao || ""] || item.condicao || "—"}</span></div>
            )}

            {item.nivelBateria !== null && <div><span className="text-gray-500">Bateria:</span> <span className="font-medium">{item.nivelBateria}%</span></div>}

            {/* PREÇO CUSTO — somente leitura */}
            {item.precoCusto !== null && item.precoCusto !== undefined && <div><span className="text-gray-500">Custo:</span> <span className="font-medium">{formatCurrency(item.precoCusto)}</span></div>}

            {/* PREÇO VENDA — editável */}
            {editando ? (
              <div>
                <label className="font-medium text-gray-700">Preço Venda:</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precoVenda}
                  onChange={(e) => setFormData((f: any) => ({ ...f, precoVenda: e.target.value }))}
                  className="ml-1 w-32 rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            ) : (
              <div>
                <span className="text-gray-500">Preço Venda:</span>
                <span className="ml-1 font-semibold">
                  {item.precoVenda ? formatCurrency(item.precoVenda) : "—"}
                </span>
              </div>
            )}

            <div><span className="text-gray-500">Entrada em:</span> <span className="font-medium">{formatDateTime(item.dataEntrada)}</span></div>
            {item.dataVenda && <div><span className="text-gray-500">Vendido em:</span> <span className="font-medium">{formatDateTime(item.dataVenda)}</span></div>}

            {/* GARANTIA — editável */}
            {editando ? (
              <div>
                <label className="font-medium text-gray-700">Garantia até:</label>
                <input
                  type="date"
                  value={formData.dataFimGarantia}
                  onChange={(e) => setFormData((f: any) => ({ ...f, dataFimGarantia: e.target.value }))}
                  className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            ) : (
              <div>
                <span className="text-gray-500">Garantia até:</span>
                <span className="font-medium">
                  {item.dataFimGarantia ? formatDateTime(item.dataFimGarantia) : "—"}
                </span>
              </div>
            )}

            {/* ACESSÓRIOS — editável */}
            {editando ? (
              <div className="col-span-2">
                <label className="font-medium text-gray-700">Acessórios inclusos:</label>
                <input
                  type="text"
                  value={formData.acessoriosInclusos}
                  onChange={(e) => setFormData((f: any) => ({ ...f, acessoriosInclusos: e.target.value }))}
                  className="ml-1 w-64 rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            ) : (
              item.acessoriosInclusos && (
                <div className="col-span-2">
                  <span className="text-gray-500">Acessórios:</span>
                  <span className="font-medium">{item.acessoriosInclusos}</span>
                </div>
              )
            )}
          </div>

          {/* OBSERVAÇÕES — editável */}
          {editando ? (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Observações:</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData((f: any) => ({ ...f, observacoes: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          ) : (
            item.observacoes && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                {item.observacoes}
              </div>
            )
          )}

          {/* BOTÕES SALVAR/CANCELAR */}
          {editando && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={salvar}
                disabled={salvando}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "💾 Salvar"}
              </button>
              <button
                onClick={() => {
                  setEditando(false);
                  // Restaura valores originais
                  setFormData({
                    precoVenda: item.precoVenda ?? "",
                    dataFimGarantia: item.dataFimGarantia
                      ? new Date(item.dataFimGarantia).toISOString().split("T")[0]
                      : "",
                    observacoes: item.observacoes ?? "",
                    condicao: item.condicao ?? "",
                    acessoriosInclusos: item.acessoriosInclusos ?? "",
                  });
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* CLIENTE / ORIGEM */}
        {laudo?.cliente && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Origem — Cliente</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{laudo.cliente.nome}</span></div>
              <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{laudo.cliente.cpf || "—"}</span></div>
              <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{laudo.cliente.telefone || "—"}</span></div>
            </div>
            {laudo.observacoes && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                {laudo.observacoes}
              </p>
            )}
          </div>
        )}

        {/* RESULTADO CONSULTA IMEI */}
        {laudo && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Resultado da Consulta IMEI</h2>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                checklist.icloud === "OK" ? "bg-green-100 text-green-700" : checklist.icloud === "NOK" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
              }`}>
                <span className={`h-2 w-2 rounded-full ${checklist.icloud === "OK" ? "bg-green-500" : checklist.icloud === "NOK" ? "bg-red-500" : "bg-gray-400"}`} />
                iCloud: {checklist.icloud === "OK" ? "OFF" : checklist.icloud === "NOK" ? "ON" : "Não verificado"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                checklist.imei_limpo === "OK" ? "bg-green-100 text-green-700" : checklist.imei_limpo === "NOK" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
              }`}>
                <span className={`h-2 w-2 rounded-full ${checklist.imei_limpo === "OK" ? "bg-green-500" : checklist.imei_limpo === "NOK" ? "bg-red-500" : "bg-gray-400"}`} />
                Blacklist: {checklist.imei_limpo === "OK" ? "Limpo" : checklist.imei_limpo === "NOK" ? "BLOQUEADO" : "Não verificado"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                checklist.operadora === "OK" ? "bg-green-100 text-green-700" : checklist.operadora === "NOK" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
              }`}>
                <span className={`h-2 w-2 rounded-full ${checklist.operadora === "OK" ? "bg-green-500" : checklist.operadora === "NOK" ? "bg-red-500" : "bg-gray-400"}`} />
                SIM: {checklist.operadora === "OK" ? "Desbloqueado" : checklist.operadora === "NOK" ? "Bloqueado" : "Não verificado"}
              </span>
            </div>
          </div>
        )}

        {/* FOTOS DO LAUDO */}
        {Object.keys(fotos).length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Fotos do Laudo</h2>
            <div className="grid grid-cols-5 gap-3">
              {camposFoto.map((campo) => (
                <div key={campo.id} className="text-center">
                  <div className="flex h-24 items-center justify-center rounded-lg border bg-gray-50">
                    {fotos[campo.id] ? (
                      <img src={fotos[campo.id]} alt={campo.label} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">Sem foto</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{campo.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHECKLIST */}
        {totalItens > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">
              Checklist do Laudo ({okItens}/{totalItens} OK)
            </h2>
            <div className="space-y-1">
              {Object.entries(checklist).map(([id, valor]) => (
                <div key={id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <span className="text-sm text-gray-800">{id}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    valor === "OK" ? "bg-green-100 text-green-700" : valor === "NOK" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                  }`}>{valor as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORICO */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Histórico</h2>
          <div className="space-y-2">
            {laudo && (
              <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📥</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Entrada via Trade-in</p>
                    <p className="text-xs text-gray-500">{formatDateTime(laudo.createdAt)}</p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/estoque/trade-in/${laudo.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver trade-in →
                </Link>
              </div>
            )}
            {transacaoVenda && (
              <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Vendido</p>
                    <p className="text-xs text-gray-500">{formatDateTime(transacaoVenda.createdAt)}</p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/vendas/${transacaoVenda.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver venda →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
