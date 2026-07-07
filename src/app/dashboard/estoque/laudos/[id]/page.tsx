"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface LaudoDetalhe {
  id: string;
  aparelhoNome: string;
  imei: string | null;
  serialNumber: string | null;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  capacidade: string | null;
  nivelBateria: number | null;
  condicao: string | null;
  fotos: string | null;
  checklistResult: string | null;
  valorEstimado: number | null;
  observacoes: string | null;
  status: string;
  createdAt: string;
  cliente: { id: string; nome: string; cpf: string | null; telefone: string | null } | null;
  stockItem: any | null;
  transaction: any | null;
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  CONCLUIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

const condicaoLabels: Record<string, string> = {
  NOVO: "Novo",
  COMO_NOVO: "Como Novo",
  BOM: "Bom",
  REGULAR: "Regular",
  RUIM: "Ruim",
};

export default function LaudoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [laudo, setLaudo] = useState<LaudoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const res = await fetch(`/api/laudos/${params.id}`);
      if (res.ok) setLaudo(await res.json());
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!laudo) return <p className="mt-8 text-center text-sm text-red-600">Laudo não encontrado</p>;

  const fotos = laudo.fotos ? JSON.parse(laudo.fotos) : {};
  const checklist = laudo.checklistResult ? JSON.parse(laudo.checklistResult) : {};
  const totalItens = Object.keys(checklist).length;
  const okItens = Object.values(checklist).filter((v) => v === "OK").length;
  const aproveitamento = totalItens > 0 ? Math.round((okItens / totalItens) * 100) : 0;

  const camposFoto = [
    { id: "frente", label: "Frente" },
    { id: "verso", label: "Verso" },
    { id: "lateral_esq", label: "Lateral Esq." },
    { id: "lateral_dir", label: "Lateral Dir." },
    { id: "imei_tela", label: "IMEI na Tela" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard/estoque/laudos"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Voltar para laudos
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/estoque/laudos/${laudo.id}/imprimir`}
            target="_blank"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            🖨️ Imprimir
          </Link>
          {laudo.status === "PENDENTE" && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Cancelar este laudo?")) return;
                await fetch(`/api/laudos/${laudo.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "CANCELADO" }),
                });
                router.refresh();
                window.location.reload();
              }}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Cancelar Laudo
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* CABECALHO */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{laudo.aparelhoNome}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Criado em {formatDateTime(laudo.createdAt)} | Nº {laudo.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusColors[laudo.status] || "bg-gray-100 text-gray-600"}`}>
              {statusLabels[laudo.status] || laudo.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{laudo.cliente?.nome || "—"}</span></div>
            <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{laudo.cliente?.cpf || "—"}</span></div>
            <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{laudo.cliente?.telefone || "—"}</span></div>
            <div><span className="text-gray-500">Condição:</span> <span className="font-medium">{condicaoLabels[laudo.condicao || ""] || laudo.condicao || "—"}</span></div>
            {laudo.imei && <div><span className="text-gray-500">IMEI:</span> <span className="font-medium">{laudo.imei}</span></div>}
            {laudo.marca && <div><span className="text-gray-500">Marca:</span> <span className="font-medium">{laudo.marca}</span></div>}
            {laudo.cor && <div><span className="text-gray-500">Cor:</span> <span className="font-medium">{laudo.cor}</span></div>}
            {laudo.capacidade && <div><span className="text-gray-500">Capacidade:</span> <span className="font-medium">{laudo.capacidade}</span></div>}
            {laudo.nivelBateria !== null && <div><span className="text-gray-500">Bateria:</span> <span className="font-medium">{laudo.nivelBateria}%</span></div>}
            {laudo.valorEstimado && <div><span className="text-gray-500">Valor estimado:</span> <span className="font-semibold text-gray-900">{formatCurrency(laudo.valorEstimado)}</span></div>}
          </div>
        </div>

        {/* FOTOS */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">Fotos</h2>
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

        {/* CHECKLIST */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-gray-700">
            Checklist ({okItens}/{totalItens} OK — {aproveitamento}%)
          </h2>
          <div className="space-y-3">
            {Object.entries(checklist).map(([id, valor]) => (
              <div key={id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <span className="text-sm text-gray-800">{id}</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    valor === "OK"
                      ? "bg-green-100 text-green-700"
                      : valor === "NOK"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {valor as string}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* OBSERVACOES */}
        {laudo.observacoes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-medium text-amber-800">Observações</h3>
            <p className="mt-1 text-sm text-amber-700">{laudo.observacoes}</p>
          </div>
        )}

        {/* VINCULOS */}
        {laudo.stockItem && (
          <Link
            href={`/dashboard/estoque/${laudo.stockItem.id}`}
            className="block rounded-lg border border-green-200 bg-green-50 p-4 hover:bg-green-100"
          >
            <h3 className="text-sm font-medium text-green-800">Aparelho no Estoque</h3>
            <p className="mt-1 text-sm text-green-700">
              {laudo.stockItem.parent?.nome || "Produto"} — {laudo.stockItem.imei || ""}
              {laudo.stockItem.cor && ` — ${laudo.stockItem.cor}`}
              {laudo.stockItem.capacidade && ` — ${laudo.stockItem.capacidade}`}
            </p>
            <p className="mt-1 text-xs text-green-600">Clique para ver detalhes completos →</p>
          </Link>
        )}
        {laudo.transaction && (
          <Link
            href={`/dashboard/vendas/${laudo.transaction.id}`}
            className="block rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100"
          >
            <h3 className="text-sm font-medium text-blue-800">Vinculado à Transação</h3>
            <p className="mt-1 text-sm text-blue-700">
              Venda #{laudo.transaction.numero} — {formatCurrency(laudo.transaction.total)}
            </p>
            <p className="mt-1 text-xs text-blue-600">Clique para ver detalhes da venda →</p>
          </Link>
        )}
      </div>
    </div>
  );
}
