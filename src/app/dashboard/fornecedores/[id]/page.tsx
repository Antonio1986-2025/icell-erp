"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";

interface Fornecedor {
  id: string;
  nome: string;
  contato: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  prazoMedio: number | null;
  observacoes: string | null;
  createdAt: string;
  stockItems: {
    id: string;
    imei: string | null;
    status: string;
    precoCusto: number | null;
    dataEntrada: string;
    parent: { nome: string; marca: string | null; modelo: string | null };
  }[];
  transactions: {
    id: string;
    numero: number;
    tipo: string;
    total: number;
    status: string;
    createdAt: string;
    vendedor: { nome: string } | null;
    items: {
      parent: { nome: string } | null;
    }[];
  }[];
}

export default function FornecedorDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    contato: "",
    cnpj: "",
    telefone: "",
    email: "",
    prazoMedio: "",
    observacoes: "",
  });

  useEffect(() => {
    carregar();
  }, [params.id]);

  async function carregar() {
    const res = await fetch(`/api/fornecedores/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setFornecedor(data);
      setForm({
        nome: data.nome || "",
        contato: data.contato || "",
        cnpj: data.cnpj || "",
        telefone: data.telefone || "",
        email: data.email || "",
        prazoMedio: data.prazoMedio ? data.prazoMedio.toString() : "",
        observacoes: data.observacoes || "",
      });
    }
    setLoading(false);
  }

  function iniciarEdicao() {
    if (!fornecedor) return;
    setForm({
      nome: fornecedor.nome || "",
      contato: fornecedor.contato || "",
      cnpj: fornecedor.cnpj || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      prazoMedio: fornecedor.prazoMedio ? fornecedor.prazoMedio.toString() : "",
      observacoes: fornecedor.observacoes || "",
    });
    setEditando(true);
  }

  async function salvarEdicao() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/fornecedores/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        setSaving(false);
        return;
      }

      setEditando(false);
      await carregar();
    } catch {
      setError("Erro ao salvar");
    }
    setSaving(false);
  }

  async function excluir() {
    const res = await fetch(`/api/fornecedores/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/fornecedores");
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao excluir");
      setConfirmDelete(false);
    }
  }

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!fornecedor) return <p className="mt-8 text-center text-sm text-red-600">Fornecedor não encontrado</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/fornecedores" className="text-sm text-blue-600 hover:underline">
        ← Voltar para fornecedores
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {editando ? "Editar Fornecedor" : fornecedor.nome}
        </h1>
        <div className="flex gap-2">
          {!editando ? (
            <>
              <button
                onClick={iniciarEdicao}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </>
          ) : (
            <>
              <button
                onClick={salvarEdicao}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => setEditando(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Dados do Fornecedor */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Dados do Fornecedor</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {editando ? (
            <>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome / Razão Social</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CNPJ / CPF</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contato</label>
                <input
                  type="text"
                  value={form.contato}
                  onChange={(e) => setForm({ ...form, contato: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo Médio (dias)</label>
                <input
                  type="number"
                  value={form.prazoMedio}
                  onChange={(e) => setForm({ ...form, prazoMedio: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div><span className="text-gray-500">CNPJ/CPF:</span> <span className="font-medium">{fornecedor.cnpj || "--"}</span></div>
              <div><span className="text-gray-500">Contato:</span> <span className="font-medium">{fornecedor.contato || "--"}</span></div>
              <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{fornecedor.telefone || "--"}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{fornecedor.email || "--"}</span></div>
              <div><span className="text-gray-500">Prazo Médio:</span> <span className="font-medium">{fornecedor.prazoMedio ? `${fornecedor.prazoMedio} dias` : "--"}</span></div>
              <div><span className="text-gray-500">Cadastrado em:</span> <span className="font-medium">{formatDate(fornecedor.createdAt)}</span></div>
              {fornecedor.observacoes && (
                <div className="col-span-2 rounded-lg bg-amber-50 p-3">
                  <span className="text-sm text-amber-800">{fornecedor.observacoes}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Itens em Estoque deste Fornecedor */}
      {fornecedor.stockItems.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">
            Itens em Estoque ({fornecedor.stockItems.length})
          </h2>
          <div className="space-y-2">
            {fornecedor.stockItems.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/estoque/${item.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.parent.nome} {item.parent.marca ? `— ${item.parent.marca}` : ""}
                  </p>
                  {item.imei && <p className="text-xs font-mono text-gray-500">IMEI: {item.imei}</p>}
                  <p className="text-xs text-gray-400">Entrada: {formatDate(item.dataEntrada)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.status === "EM_ESTOQUE" ? "bg-green-100 text-green-700" :
                    item.status === "VENDIDO" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {item.status === "EM_ESTOQUE" ? "Em Estoque" : item.status === "VENDIDO" ? "Vendido" : item.status}
                  </span>
                  {item.precoCusto && (
                    <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(item.precoCusto)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de Transações */}
      {fornecedor.transactions.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Últimas Transações</h2>
          <div className="space-y-2">
            {fornecedor.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{t.numero} — {t.tipo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.vendedor?.nome && `${t.vendedor.nome} | `}{formatDateTime(t.createdAt)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(t.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDelete(false)}>
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Excluir Fornecedor</h2>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza que deseja excluir <strong>{fornecedor.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
