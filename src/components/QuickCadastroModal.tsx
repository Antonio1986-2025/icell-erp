"use client";

import { useState } from "react";

type ModalTipo = "produto" | "cliente" | "fornecedor";

interface Props {
  tipo: ModalTipo;
  nomeInicial?: string;
  onClose: () => void;
  onConfirm: (dados: any) => Promise<void>;
}

const titles: Record<ModalTipo, string> = {
  produto: "Novo Produto",
  cliente: "Novo Cliente",
  fornecedor: "Novo Fornecedor",
};

const fields: Record<ModalTipo, { label: string; placeholder: string; key: string; required?: boolean }[]> = {
  produto: [
    { label: "Nome *", placeholder: "Nome do produto", key: "nome", required: true },
    { label: "Marca", placeholder: "Ex: Apple, Samsung", key: "marca" },
    { label: "Modelo", placeholder: "Ex: iPhone 16 Pro Max", key: "modelo" },
  ],
  cliente: [
    { label: "Nome *", placeholder: "Nome do cliente", key: "nome", required: true },
    { label: "CPF", placeholder: "000.000.000-00", key: "cpf" },
    { label: "Telefone", placeholder: "(11) 99999-9999", key: "telefone" },
  ],
  fornecedor: [
    { label: "Nome *", placeholder: "Nome do fornecedor", key: "nome", required: true },
    { label: "CNPJ", placeholder: "00.000.000/0000-00", key: "cnpj" },
    { label: "Contato", placeholder: "Telefone ou e-mail", key: "contato" },
  ],
};

export default function QuickCadastroModal({ tipo, nomeInicial, onClose, onConfirm }: Props) {
  const [nome, setNome] = useState(nomeInicial || "");
  const [extra1, setExtra1] = useState("");
  const [extra2, setExtra2] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
    } else if (tipo === "fornecedor") {
      dados.cnpj = extra1;
      dados.contato = extra2;
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
