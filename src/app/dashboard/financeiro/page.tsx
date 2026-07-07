"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

type ContaPagar = {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  categoria: string | null;
  status: string;
  fornecedor: { nome: string } | null;
  observacoes: string | null;
};

type ContaReceber = {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataRecebimento: string | null;
  categoria: string | null;
  status: string;
  cliente: { nome: string } | null;
  observacoes: string | null;
};

type Tab = "pagar" | "receber" | "fluxo";

const statusPagarLabels: Record<string, string> = { PENDENTE: "Pendente", PAGO: "Pago", CANCELADO: "Cancelado" };
const statusPagarColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  PAGO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};
const statusReceberLabels: Record<string, string> = { PENDENTE: "Pendente", RECEBIDO: "Recebido", CANCELADO: "Cancelado" };
const statusReceberColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  RECEBIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("pagar");
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({ descricao: "", valor: "", dataVencimento: "", categoria: "", fornecedorId: "", clienteId: "", observacoes: "" });
  const [error, setError] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    const [pagar, receber] = await Promise.all([
      fetch("/api/financeiro/contas-pagar").then((r) => r.json()),
      fetch("/api/financeiro/contas-receber").then((r) => r.json()),
    ]);
    setContasPagar(pagar);
    setContasReceber(receber);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm({ descricao: "", valor: "", dataVencimento: "", categoria: "", fornecedorId: "", clienteId: "", observacoes: "" });
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function abrirEditar(conta: any) {
    setForm({
      descricao: conta.descricao,
      valor: String(conta.valor),
      dataVencimento: conta.dataVencimento.slice(0, 10),
      categoria: conta.categoria || "",
      fornecedorId: conta.fornecedorId || "",
      clienteId: conta.clienteId || "",
      observacoes: conta.observacoes || "",
    });
    setEditingId(conta.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setError("");

    const endpoint = tab === "pagar" ? "/api/financeiro/contas-pagar" : "/api/financeiro/contas-receber";
    const url = editingId ? `${endpoint}/${editingId}` : endpoint;
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao salvar");
      setSalvando(false);
      return;
    }

    setShowForm(false);
    setSalvando(false);
    carregar();
  }

  async function pagarReceber(conta: ContaPagar) {
    await fetch(`/api/financeiro/contas-pagar/${conta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAGO", dataPagamento: new Date().toISOString().slice(0, 10) }),
    });
    carregar();
  }

  async function receber(conta: ContaReceber) {
    await fetch(`/api/financeiro/contas-receber/${conta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEBIDO", dataRecebimento: new Date().toISOString().slice(0, 10) }),
    });
    carregar();
  }

  async function excluir(conta: any) {
    if (!confirm("Excluir esta conta?")) return;
    const endpoint = tab === "pagar" ? `/api/financeiro/contas-pagar/${conta.id}` : `/api/financeiro/contas-receber/${conta.id}`;
    await fetch(endpoint, { method: "DELETE" });
    carregar();
  }

  const pendentesPagar = contasPagar.filter((c) => c.status === "PENDENTE");
  const pendentesReceber = contasReceber.filter((c) => c.status === "PENDENTE");
  const totalPagar = pendentesPagar.reduce((s, c) => s + c.valor, 0);
  const totalReceber = pendentesReceber.reduce((s, c) => s + c.valor, 0);

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500">Gerencie contas a pagar e receber</p>
      </div>

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">A Pagar (pendente)</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalPagar)}</p>
          <p className="text-xs text-gray-400">{pendentesPagar.length} conta{pendentesPagar.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">A Receber (pendente)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totalReceber)}</p>
          <p className="text-xs text-gray-400">{pendentesReceber.length} conta{pendentesReceber.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Saldo Previsto</p>
          <p className={`mt-1 text-2xl font-bold ${totalReceber - totalPagar >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {formatCurrency(totalReceber - totalPagar)}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-4 flex gap-2">
        {([["pagar", "Contas a Pagar"], ["receber", "Contas a Receber"], ["fluxo", "Fluxo de Caixa"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setShowForm(false); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === key ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Aba Fluxo */}
      {tab === "fluxo" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Resumo Financeiro</h2>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Total de Contas Pagas</span>
                <span className="font-semibold text-green-600">{formatCurrency(contasPagar.filter((c) => c.status === "PAGO").reduce((s, c) => s + c.valor, 0))}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Total de Contas Recebidas</span>
                <span className="font-semibold text-green-600">{formatCurrency(contasReceber.filter((c) => c.status === "RECEBIDO").reduce((s, c) => s + c.valor, 0))}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">A Pagar (pendente)</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalPagar)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">A Receber (pendente)</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalReceber)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-bold text-gray-900">Saldo Previsto</span>
                <span className={`font-bold ${totalReceber - totalPagar >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(totalReceber - totalPagar)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abas Pagar / Receber */}
      {(tab === "pagar" || tab === "receber") && (
        <>
          <div className="mb-4">
            <button onClick={abrirNovo} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + Nova {tab === "pagar" ? "Conta a Pagar" : "Conta a Receber"}
            </button>
          </div>

          {/* Formulário */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {editingId ? "Editar" : "Nova"} {tab === "pagar" ? "Conta a Pagar" : "Conta a Receber"}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Descrição</label>
                  <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vencimento</label>
                  <input type="date" value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Categoria</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">Selecione...</option>
                    {tab === "pagar"
                      ? ["FORNECEDOR", "ALUGUEL", "SALARIO", "IMPOSTO", "DESPESA", "OUTRO"].map((c) => <option key={c} value={c}>{c}</option>)
                      : ["VENDA", "SERVICO", "GARANTIA", "OUTRO"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{tab === "pagar" ? "Fornecedor ID" : "Cliente ID"}</label>
                  <input type="text" value={tab === "pagar" ? form.fornecedorId : form.clienteId}
                    onChange={(e) => setForm({ ...form, [tab === "pagar" ? "fornecedorId" : "clienteId"]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="ID (opcional)" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={salvando}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Tabela */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Descrição</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Vencimento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(tab === "pagar" ? contasPagar : contasReceber).map((conta: any) => (
                  <tr key={conta.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{conta.descricao}</p>
                      <p className="text-xs text-gray-400">{conta.categoria || ""} {conta.cliente?.nome ? `- ${conta.cliente.nome}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(conta.valor)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">{formatDate(conta.dataVencimento)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tab === "pagar" ? statusPagarColors[conta.status] : statusReceberColors[conta.status]}`}>
                        {tab === "pagar" ? statusPagarLabels[conta.status] : statusReceberLabels[conta.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {conta.status === "PENDENTE" && (
                          <button onClick={() => tab === "pagar" ? pagarReceber(conta) : receber(conta)}
                            className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">
                            {tab === "pagar" ? "Pagar" : "Receber"}
                          </button>
                        )}
                        <button onClick={() => abrirEditar(conta)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                          Editar
                        </button>
                        <button onClick={() => excluir(conta)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(tab === "pagar" ? contasPagar : contasReceber).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">Nenhuma conta cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
