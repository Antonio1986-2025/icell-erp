"use client";

import { useEffect, useState } from "react";

type Catalog = {
  id: string;
  nome: string | null;
  fornecedor: string;
  arquivoOriginal: string;
  tipoArquivo: string;
  status: string;
  totalItens: number;
  extracaoErro: string | null;
  createdAt: string;
};

type CatalogItem = {
  id: string;
  descricao: string;
  modelo: string | null;
  capacidade: string | null;
  precoUsd: number;
  condicao: string | null;
};

export default function FornecedoresTab() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/configuracoes/fornecedores");
      if (res.ok) setCatalogs(await res.json());
    } catch {
      setError("Erro ao carregar catálogos");
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/configuracoes/fornecedores", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao fazer upload");
      } else {
        form.reset();
        carregar();
      }
    } catch {
      setError("Erro de conexão ao enviar arquivo");
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta tabela? Os produtos importados serão removidos.")) return;
    try {
      const res = await fetch(`/api/configuracoes/fornecedores/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCatalogs((prev) => prev.filter((c) => c.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch {
      setError("Erro ao excluir");
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setItemsLoading(true);
    try {
      const res = await fetch(`/api/configuracoes/fornecedores/${id}`);
      if (res.ok) setItems(await res.json());
    } catch {}
    setItemsLoading(false);
  };

  const corStatus = (status: string) => {
    switch (status) {
      case "CONCLUIDO": return "text-green-600";
      case "PROCESSANDO": return "text-yellow-600";
      case "ERRO": return "text-red-600";
      default: return "text-gray-500";
    }
  };

  const formatarData = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">📦 Tabelas de Fornecedores</h2>

      {/* Upload */}
      <form onSubmit={handleUpload} className="bg-gray-50 p-4 rounded mb-6 border">
        <p className="text-sm text-gray-600 mb-3">
          Faça upload da tabela do fornecedor (PDF, Excel ou imagem). 
          Os preços em dólar serão convertidos automaticamente.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
            <input
              name="fornecedor"
              className="border p-2 rounded text-sm w-40"
              placeholder="Ex: Best Shop"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Tabela (opcional)</label>
            <input
              name="nome"
              className="border p-2 rounded text-sm w-48"
              placeholder="Ex: Tabela Maio 2025"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Arquivo</label>
            <input
              type="file"
              name="file"
              accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
              className="text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Enviando..." : "📤 Upload"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </form>

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : catalogs.length === 0 ? (
        <p className="text-gray-500">Nenhuma tabela cadastrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {catalogs.map((cat) => (
            <div key={cat.id} className="border rounded bg-white">
              <div className="flex items-center justify-between p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cat.fornecedor}</span>
                    {cat.nome && <span className="text-gray-500 text-sm">— {cat.nome}</span>}
                    <span className={`text-xs font-medium ${corStatus(cat.status)}`}>
                      {cat.status === "CONCLUIDO" ? "✓ Concluído" : cat.status === "PROCESSANDO" ? "⏳ Processando" : "✗ Erro"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cat.arquivoOriginal} • {cat.totalItens} produtos • {formatarData(cat.createdAt)}
                  </div>
                  {cat.extracaoErro && (
                    <p className="text-xs text-red-500 mt-1">⚠ {cat.extracaoErro}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {expandedId === cat.id ? "▲" : "▼"}
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Itens expandidos */}
              {expandedId === cat.id && (
                <div className="border-t bg-gray-50 p-3">
                  {itemsLoading ? (
                    <p className="text-sm text-gray-500">Carregando itens...</p>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum item</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto text-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="pb-1">Produto</th>
                            <th className="pb-1">Capacidade</th>
                            <th className="pb-1">Preço USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="py-1">{item.descricao}</td>
                              <td className="py-1">{item.capacidade || "-"}</td>
                              <td className="py-1">US$ {item.precoUsd.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
