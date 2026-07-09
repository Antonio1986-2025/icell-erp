"use client";

import { useEffect, useState } from "react";
import FornecedoresTab from "@/components/FornecedoresTab";

type Tab = "loja" | "categorias" | "usuarios" | "pagamentos" | "whatsapp" | "fornecedores";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("loja");
  const [tenant, setTenant] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [metodosPagamento, setMetodosPagamento] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [catForm, setCatForm] = useState({ nome: "", hasImei: false, hasBattery: false, hasSerial: false, hasWarranty: true });
  const [userForm, setUserForm] = useState({ nome: "", email: "", senha: "", role: "VENDEDOR", comissao: "" });
  const [pagForm, setPagForm] = useState({ nome: "", tipo: "DINHEIRO" });
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [catRes, userRes, pagRes] = await Promise.all([
        fetch("/api/configuracoes/categorias"),
        fetch("/api/configuracoes/usuarios"),
        fetch("/api/configuracoes/pagamentos"),
      ]);
      if (catRes.ok) setCategorias(await catRes.json());
      if (userRes.ok) setUsuarios(await userRes.json());
      if (pagRes.ok) setMetodosPagamento(await pagRes.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvarCategoria(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const url = editCatId ? `/api/configuracoes/categorias/${editCatId}` : "/api/configuracoes/categorias";
    const res = await fetch(url, {
      method: editCatId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    });
    if (!res.ok) { setError((await res.json()).error); setSaving(false); return; }
    setCatForm({ nome: "", hasImei: false, hasBattery: false, hasSerial: false, hasWarranty: true });
    setEditCatId(null);
    setSaving(false);
    carregar();
  }

  async function excluirCategoria(id: string) {
    if (!confirm("Excluir categoria?")) return;
    const res = await fetch(`/api/configuracoes/categorias/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error); return; }
    carregar();
  }

  function editarCategoria(cat: any) {
    setCatForm({ nome: cat.nome, hasImei: cat.hasImei, hasBattery: cat.hasBattery, hasSerial: cat.hasSerial, hasWarranty: cat.hasWarranty });
    setEditCatId(cat.id);
  }

  async function salvarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const url = editUserId ? `/api/configuracoes/usuarios/${editUserId}` : "/api/configuracoes/usuarios";
    const body: any = { nome: userForm.nome, email: userForm.email, role: userForm.role, comissao: userForm.comissao };
    if (userForm.senha) body.senha = userForm.senha;
    const res = await fetch(url, {
      method: editUserId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setError((await res.json()).error); setSaving(false); return; }
    setUserForm({ nome: "", email: "", senha: "", role: "VENDEDOR", comissao: "" });
    setEditUserId(null);
    setSaving(false);
    carregar();
  }

  function editarUsuario(u: any) {
    setUserForm({ nome: u.nome, email: u.email, senha: "", role: u.role, comissao: u.comissao || "" });
    setEditUserId(u.id);
  }

  async function salvarPagamento(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/configuracoes/pagamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pagForm),
    });
    if (!res.ok) { setError((await res.json()).error); setSaving(false); return; }
    setPagForm({ nome: "", tipo: "DINHEIRO" });
    setSaving(false);
    carregar();
  }

  if (loading) return <p className="mt-8 text-center text-sm text-gray-500">Carregando...</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Configurações</h1>
      <p className="mb-6 text-sm text-gray-500">Gerencie sua loja, categorias, usuários e formas de pagamento</p>

      {/* Abas responsivas */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
        {([["loja", "📋 Loja"], ["categorias", "🏷️ Categorias"], ["usuarios", "👥 Usuários"], ["pagamentos", "💳 Pagamentos"], ["whatsapp", "💬 WhatsApp"], ["fornecedores", "📦 Fornecedores"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`snap-start shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              tab === key
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ==================== DADOS DA LOJA ==================== */}
      {tab === "loja" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Dados da Loja</h2>
          <p className="text-sm text-gray-500 mb-4">As informações da loja são definidas no cadastro. Para alterar, edite diretamente no banco de dados.</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="font-medium text-gray-700">Nome:</span><span className="text-gray-900">Minha Loja</span></div>
            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="font-medium text-gray-700">Slug:</span><span className="text-gray-900">minha-loja</span></div>
            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="font-medium text-gray-700">Email:</span><span className="text-gray-500">—</span></div>
            <div className="flex justify-between border-b border-gray-100 pb-2"><span className="font-medium text-gray-700">Telefone:</span><span className="text-gray-500">—</span></div>
            <div className="flex justify-between pb-2"><span className="font-medium text-gray-700">CNPJ:</span><span className="text-gray-500">—</span></div>
          </div>
        </div>
      )}

      {/* ==================== CATEGORIAS ==================== */}
      {tab === "categorias" && (
        <div className="space-y-6">
          <form onSubmit={salvarCategoria} className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{editCatId ? "Editar" : "Nova"} Categoria</h2>
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} required
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm" />
              </div>
              <div className="flex flex-wrap items-end gap-4 pb-2">
                {(["hasImei", "hasBattery", "hasSerial", "hasWarranty"] as const).map((field) => (
                  <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={catForm[field]} onChange={(e) => setCatForm({ ...catForm, [field]: e.target.checked })}
                      className="h-5 w-5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600" />
                    {field === "hasImei" ? "IMEI" : field === "hasBattery" ? "Bateria" : field === "hasSerial" ? "Serial" : "Garantia"}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98] md:py-2.5">
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {editCatId && <button type="button" onClick={() => { setEditCatId(null); setCatForm({ nome: "", hasImei: false, hasBattery: false, hasSerial: false, hasWarranty: true }); }}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98] md:py-2.5">Cancelar</button>}
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[600px] w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">IMEI</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Bateria</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Serial</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Garantia</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{cat.nome}</td>
                    <td className="px-4 py-3 text-center">{cat.hasImei ? "✅" : "—"}</td>
                    <td className="px-4 py-3 text-center">{cat.hasBattery ? "✅" : "—"}</td>
                    <td className="px-4 py-3 text-center">{cat.hasSerial ? "✅" : "—"}</td>
                    <td className="px-4 py-3 text-center">{cat.hasWarranty ? "✅" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => editarCategoria(cat)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 mr-1">Editar</button>
                      <button onClick={() => excluirCategoria(cat.id)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Excluir</button>
                    </td>
                  </tr>
                ))}
                {categorias.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">Nenhuma categoria</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== USUÁRIOS ==================== */}
      {tab === "usuarios" && (
        <div className="space-y-6">
          <form onSubmit={salvarUsuario} className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{editUserId ? "Editar" : "Novo"} Usuário</h2>
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" value={userForm.nome} onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })} required
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha {editUserId && "(deixe vazio para manter)"}</label>
                <input type="password" value={userForm.senha} onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })}
                  required={!editUserId}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Função</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm">
                  <option value="ADMIN">Admin</option>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="COMPRADOR">Comprador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comissão (%)</label>
                <input type="number" step="0.1" value={userForm.comissao} onChange={(e) => setUserForm({ ...userForm, comissao: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm" />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98] md:py-2.5">
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {editUserId && <button type="button" onClick={() => { setEditUserId(null); setUserForm({ nome: "", email: "", senha: "", role: "VENDEDOR", comissao: "" }); }}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98] md:py-2.5">Cancelar</button>}
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[500px] w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Função</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Comissão</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{u.comissao ? `${u.comissao}%` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => editarUsuario(u)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">Editar</button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">Nenhum usuário</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== PAGAMENTOS ==================== */}
      {tab === "pagamentos" && (
        <div className="space-y-6">
          <form onSubmit={salvarPagamento} className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova Forma de Pagamento</h2>
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" value={pagForm.nome} onChange={(e) => setPagForm({ ...pagForm, nome: e.target.value })} required
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select value={pagForm.tipo} onChange={(e) => setPagForm({ ...pagForm, tipo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all md:py-2.5 md:text-sm">
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving}
              className="mt-4 w-full sm:w-auto rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98] md:py-2.5">
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metodosPagamento.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{m.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.tipo}</td>
                  </tr>
                ))}
                {metodosPagamento.length === 0 && <tr><td colSpan={2} className="px-4 py-12 text-center text-sm text-gray-500">Nenhum método de pagamento</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== WHATSAPP ==================== */}
      {tab === "whatsapp" && <WhatsAppConfig />}

      {/* ==================== FORNECEDORES ==================== */}
      {tab === "fornecedores" && <FornecedoresTab />}
    </div>
  );
}

// ==================== COMPONENTE WHATSAPP ====================
function WhatsAppConfig() {
  const [status, setStatus] = useState<"loading" | "disconnected" | "connected" | "error">("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function checkStatus() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      if (data.connected) {
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Erro ao verificar status");
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setQrCode(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (data.qrcode) {
        const src = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCode(src);
        setStatus("disconnected");
      } else if (data.status === "connected" || data.connected) {
        setStatus("connected");
      } else {
        setErrorMsg(data.error || "Erro ao gerar QR Code");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    setConnecting(true);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setStatus("disconnected");
      setQrCode(null);
    } catch {
      setErrorMsg("Erro ao desconectar");
    }
    setConnecting(false);
  }

  useEffect(() => { checkStatus(); }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">💬 WhatsApp</h2>
        <p className="mb-6 text-sm text-gray-500">
          Conecte o WhatsApp da loja para que o agente IA possa atender clientes automaticamente.
        </p>

        {/* Status */}
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-gray-50 p-4">
          <span className="text-lg">
            {status === "connected" ? "🟢" : status === "loading" ? "🔄" : "🔴"}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {status === "connected" && "WhatsApp Conectado"}
              {status === "disconnected" && "WhatsApp Desconectado"}
              {status === "loading" && "Verificando..."}
              {status === "error" && "Erro na conexão"}
            </p>
            <p className="text-xs text-gray-500">
              {status === "connected"
                ? "O agente IA está ativo e pronto para atender"
                : status === "disconnected"
                  ? "Clique em Conectar para escanear o QR Code"
                  : "Verifique as configurações da Evolution API"}
            </p>
          </div>
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-6">
            <p className="text-sm font-medium text-blue-700">
              📱 Escaneie o QR Code com seu WhatsApp
            </p>
            <p className="text-xs text-blue-500">
              Abra o WhatsApp no celular → Configurações → Dispositivos conectados → Conectar
            </p>
            <img
              src={qrCode}
              alt="QR Code WhatsApp"
              className="h-64 w-64 rounded-xl border-4 border-white shadow-lg"
            />
            <p className="text-xs text-gray-500">
              Após escanear, o status mudará para "Conectado" automaticamente
            </p>
          </div>
        )}

        {/* Erro */}
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-wrap gap-3">
          {status !== "connected" && (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/25 hover:bg-green-700 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {connecting ? "Conectando..." : qrCode ? "🔄 Gerar novo QR Code" : "📱 Conectar WhatsApp"}
            </button>
          )}

          {status === "connected" && (
            <button
              onClick={handleDisconnect}
              disabled={connecting}
              className="rounded-xl border border-red-300 px-6 py-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              Desconectar
            </button>
          )}

          <button
            onClick={checkStatus}
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            🔄 Atualizar status
          </button>
        </div>
      </div>

      {/* Informações */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">ℹ️ Sobre o Agente WhatsApp</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>🤖 O agente IA responde automaticamente perguntas sobre <strong>produtos, preços e estoque</strong></li>
          <li>💬 Clientes podem consultar preços e disponibilidade diretamente pelo WhatsApp</li>
          <li>🔄 O agente também calcula <strong>troca com laudo</strong> (avaliação de aparelho usado)</li>
          <li>⚙️ Para alterar o comportamento do agente, edite o arquivo <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ai-assistant.service.ts</code></li>
        </ul>
      </div>
    </div>
  );
}
