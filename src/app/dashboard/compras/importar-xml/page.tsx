"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function ImportarXMLPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState<"upload" | "preview" | "concluido">("upload");
  const [preview, setPreview] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xml") || f.type.includes("xml"))) {
      setFile(f);
      setErro("");
    } else {
      setErro("Selecione um arquivo .xml válido");
    }
  }

  async function enviarPreview() {
    if (!file) return;
    setLoading(true);
    setErro("");

    const formData = new FormData();
    formData.append("xml", file);
    formData.append("observacoes", observacoes);

    try {
      const r = await fetch("/api/compras/importar-xml", {
        method: "POST",
        body: formData,
      });
      const data = await r.json();

      if (r.ok && data.preview) {
        setPreview(data);
        setEtapa("preview");
      } else if (r.status === 400 && data.preview) {
        // Nota de saída - pode importar mesmo assim
        setPreview(data);
        setEtapa("preview");
      } else {
        setErro(data.error || "Erro ao processar XML");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  async function confirmarImportacao() {
    if (!file) return;
    setLoading(true);
    setErro("");

    const formData = new FormData();
    formData.append("xml", file);
    formData.append("confirmar", "true");
    formData.append("observacoes", observacoes);
    if (preview?.fornecedor?.id) {
      formData.append("fornecedorId", preview.fornecedor.id);
    }

    try {
      const r = await fetch("/api/compras/importar-xml", {
        method: "POST",
        body: formData,
      });
      const data = await r.json();

      if (r.ok && data.success) {
        setResultado(data);
        setEtapa("concluido");
      } else {
        setErro(data.error || "Erro ao importar");
      }
    } catch {
      setErro("Erro de conexão");
    }
    setLoading(false);
  }

  function formatMoney(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📄 Importar XML NFe</h1>
          <p className="mt-1 text-sm text-gray-500">
            Faça upload do XML da Nota Fiscal para criar a compra automaticamente
          </p>
        </div>
        <Link
          href="/dashboard/compras"
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Voltar
        </Link>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ❌ {erro}
        </div>
      )}

      {/* Etapa 1: Upload */}
      {etapa === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all"
          >
            <p className="text-5xl mb-3">📄</p>
            <p className="text-lg font-medium text-gray-700">
              {file ? file.name : "Clique ou arraste o XML aqui"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : "Apenas arquivos .xml de Nota Fiscal Eletrônica"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xml,text/xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  setErro("");
                }
              }}
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Nota fiscal do fornecedor X"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              rows={2}
            />
          </div>

          <button
            onClick={enviarPreview}
            disabled={!file || loading}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? "⏳ Processando XML..." : "🔍 Analisar XML"}
          </button>
        </div>
      )}

      {/* Etapa 2: Preview */}
      {etapa === "preview" && preview && (
        <div className="space-y-4">
          {/* Aviso NF Saída */}
          {preview.isSaida && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              ⚠️ Esta nota é de SAÍDA (venda). Mesmo assim, os itens serão adicionados ao estoque como compra.
            </div>
          )}

          {/* Fornecedor */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-3">🏭 Fornecedor</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Nome:</span>
                <p className="font-medium text-gray-900">{preview.fornecedor.nome}</p>
              </div>
              <div>
                <span className="text-gray-500">CNPJ:</span>
                <p className="font-mono text-gray-900">{preview.fornecedor.cnpj}</p>
              </div>
              <div>
                <span className="text-gray-500">Fantasia:</span>
                <p className="text-gray-900">{preview.fornecedor.fantasia}</p>
              </div>
              <div>
                {preview.fornecedor.existente ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    ✅ Já cadastrado
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    🆕 Será cadastrado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Documento */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-3">📄 Documento</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Número:</span>
                <p className="font-medium text-gray-900">{preview.documento.numeroNota}</p>
              </div>
              <div>
                <span className="text-gray-500">Série:</span>
                <p className="font-medium text-gray-900">{preview.documento.serie}</p>
              </div>
              <div>
                <span className="text-gray-500">Data:</span>
                <p className="text-gray-900">{preview.documento.dataEmissao || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Tipo:</span>
                <p className="text-gray-900">{preview.documento.tipo}</p>
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase text-gray-700">
                📦 Itens ({preview.itens.length})
              </h2>
              <p className="text-sm font-semibold text-blue-700">
                Total NF: {formatMoney(preview.documento.valorTotal)}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {preview.itens.map((item: any, idx: number) => (
                <div key={idx} className="flex flex-wrap items-center justify-between px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.codigo && `Cód: ${item.codigo}`}
                      {item.ncm && ` · NCM: ${item.ncm}`}
                      {item.cfop && ` · CFOP: ${item.cfop}`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-900">x{item.quantidade}</p>
                    <p className="text-gray-500">{formatMoney(item.valorUnitario)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={() => setEtapa("upload")}
              className="flex-1 rounded-2xl border border-gray-300 px-6 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              🔄 Cancelar
            </button>
            <button
              onClick={confirmarImportacao}
              disabled={loading}
              className="flex-[2] rounded-2xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-green-500/25 hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? "⏳ Importando..." : "✅ Confirmar Importação"}
            </button>
          </div>
        </div>
      )}

      {/* Etapa 3: Concluído */}
      {etapa === "concluido" && resultado && (
        <div className="rounded-2xl bg-white border border-green-200 p-8 text-center shadow-lg">
          <p className="text-6xl mb-4">🎉</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Importação Concluída!</h2>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto my-6">
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-700">{resultado.totalItens}</p>
              <p className="text-xs text-green-600">Itens</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{resultado.transactionNumero}</p>
              <p className="text-xs text-blue-600">Compra #</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3">
              <p className="text-lg font-bold text-purple-700">{formatMoney(resultado.valorTotal)}</p>
              <p className="text-xs text-purple-600">Valor</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Fornecedor: <strong>{resultado.fornecedor}</strong>
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/dashboard/compras/${resultado.transactionId}`}
              className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
            >
              📦 Ver Compra
            </Link>
            <Link
              href="/dashboard/compras/importar-xml"
              className="rounded-2xl border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📄 Importar Outra
            </Link>
            <Link
              href="/dashboard/compras"
              className="rounded-2xl border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📋 Lista
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
