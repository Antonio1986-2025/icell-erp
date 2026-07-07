"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";

interface Cliente {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  dataNascimento: string | null;
  observacoes: string | null;
  totalCompras: number;
  ultimaCompra: string | null;
  createdAt: string;
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
      stockItem: { imei: string } | null;
    }[];
  }[];
  inspectionReports: {
    id: string;
    aparelhoNome: string;
    valorEstimado: number | null;
    status: string;
    createdAt: string;
  }[];
}

export default function ClienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    rg: "",
    telefone: "",
    email: "",
    endereco: "",
    dataNascimento: "",
    observacoes: "",
  });

  useEffect(() => {
    carregar();
  }, [params.id]);

  async function carregar() {
    const res = await fetch(`/api/clientes/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setCliente(data);
      setForm({
        nome: data.nome || "",
        cpf: data.cpf || "",
        rg: data.rg || "",
        telefone: data.telefone || "",
        email: data.email || "",
        endereco: data.endereco || "",
        dataNascimento: data.dataNascimento ? data.dataNascimento.split("T")[0] : "",
        observacoes: data.observacoes || "",
      });
    }
    setLoading(false);
  }

  function iniciarEdicao() {
    if (!cliente) return;
    setForm({
      nome: cliente.nome || "",
      cpf: cliente.cpf || "",
      rg: cliente.rg || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      endereco: cliente.endereco || "",
      dataNascimento: cliente.dataNascimento ? cliente.dataNascimento.split("T")[0] : "",
      observacoes: cliente.observacoes || "",
    });
    setEditando(true);
  }

  async function salvarEdicao() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/clientes/${params.id}`, {
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
    const res = await fetch(`/api/clientes/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/clientes");
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao excluir");
      setConfirmDelete(false);
    }
  }

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!cliente) return <p className="mt-8 text-center text-sm text-red-600">Cliente não encontrado</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/clientes" className="text-sm text-blue-600 hover:underline">
        ← Voltar para clientes
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {editando ? "Editar Cliente" : cliente.nome}
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

      {/* Dados do Cliente */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Dados Pessoais</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {editando ? (
            <>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RG</label>
                <input
                  type="text"
                  value={form.rg}
                  onChange={(e) => setForm({ ...form, rg: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                <input
                  type="date"
                  value={form.dataNascimento}
                  onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Endereço</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
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
              <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{cliente.cpf || "--"}</span></div>
              <div><span className="text-gray-500">RG:</span> <span className="font-medium">{cliente.rg || "--"}</span></div>
              <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{cliente.telefone || "--"}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{cliente.email || "--"}</span></div>
              <div><span className="text-gray-500">Nascimento:</span> <span className="font-medium">{cliente.dataNascimento ? formatDate(cliente.dataNascimento) : "--"}</span></div>
              <div><span className="text-gray-500">Cadastrado em:</span> <span className="font-medium">{formatDate(cliente.createdAt)}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Endereço:</span> <span className="font-medium">{cliente.endereco || "--"}</span></div>
              {cliente.observacoes && (
                <div className="col-span-2 rounded-lg bg-amber-50 p-3">
                  <span className="text-sm text-amber-800">{cliente.observacoes}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total de Compras</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(cliente.totalCompras)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Última Compra</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {cliente.ultimaCompra ? formatDate(cliente.ultimaCompra) : "Nenhuma"}
          </p>
        </div>
      </div>

      {/* Histórico de Transações */}
      {cliente.transactions.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Histórico de Transações</h2>
          <div className="space-y-2">
            {cliente.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{t.numero} — {t.tipo}
                    {t.status !== "CONCLUIDA" && (
                      <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        {t.status}
                      </span>
                    )}
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

      {/* Laudos */}
      {cliente.inspectionReports.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase text-gray-700">Laudos de Inspeção</h2>
          <div className="space-y-2">
            {cliente.inspectionReports.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/estoque/laudos/${l.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{l.aparelhoNome}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(l.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.status === "PENDENTE" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                  }`}>
                    {l.status}
                  </span>
                  {l.valorEstimado && (
                    <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(l.valorEstimado)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDelete(false)}>
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Excluir Cliente</h2>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza que deseja excluir <strong>{cliente.nome}</strong>? Esta ação não pode ser desfeita.
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
