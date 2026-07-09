import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getCompra(id: string, tenantId: string) {
  const compra = await prisma.transaction.findFirst({
    where: { id, tenantId },
    include: {
      fornecedor: { select: { id: true, nome: true, cnpj: true } },
      cliente: { select: { id: true, nome: true, cpf: true } },
      criador: { select: { id: true, nome: true } },
      items: {
        include: {
          parent: { select: { id: true, nome: true, marca: true, modelo: true, categoria: true, sku: true } },
          stockItem: {
            select: {
              id: true, imei: true, serialNumber: true, nivelBateria: true,
              precoVenda: true, precoCusto: true, status: true, condicao: true,
              cor: true, capacidade: true,
            },
          },
        },
      },
    },
  });
  return compra;
}

export default async function CompraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return <p className="p-6 text-gray-500">Acesso não autorizado</p>;
  const tenantId = (session.user as any).tenantId;
  const { id } = await params;
  const compra = await getCompra(id, tenantId);
  if (!compra) notFound();

  const itensComImei = compra.items.filter(i => i.stockItem?.imei || i.stockItem?.serialNumber);
  const totalCompra = compra.items.reduce((acc, i) => acc + (i.stockItem?.precoCusto ?? i.precoUnit * i.quantidade), 0);
  const tipoLabel = compra.tipo === "COMPRA" ? "🛒 Compra Direta" : "📋 Pré-Venda";
  const statusLabel: Record<string, string> = {
    "PRE_VENDA": "⏳ Pré-venda",
    "AGUARDANDO_COMPRA": "🛒 Aguardando compra",
    "COMPRA_REALIZADA": "📦 Compra realizada",
    "RECEBIDA": "✅ Recebido",
    "CONCLUIDA": "✅ Concluída",
    "CANCELADA": "❌ Cancelada",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Compra #{compra.numero}</h1>
            <span className="text-sm text-gray-400">· {tipoLabel}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {compra.fornecedor ? `Fornecedor: ${compra.fornecedor.nome}` : ""}
            {compra.cliente ? `Cliente: ${compra.cliente.nome}` : ""}
            {` · ${formatDateTime(compra.createdAt)}`}
            {compra.criador && ` · Por: ${compra.criador.nome}`}
          </p>
        </div>
        <Link
          href="/dashboard/compras"
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Voltar
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{statusLabel[compra.status] || compra.status}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Itens</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{compra.items.length} unidade(s)</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Custo Total</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(compra.custoTotal || totalCompra)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Com IMEI</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{itensComImei.length} unidade(s)</p>
        </div>
      </div>

      {/* Itens */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-gray-700">Itens da Compra</h2>
        </div>
        {compra.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Nenhum item</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {compra.items.map((item, idx) => {
              const s = item.stockItem;
              return (
                <div key={item.id || idx} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.parent?.marca ? item.parent.marca + " " : ""}{item.parent?.nome || "Produto"}{item.parent?.modelo ? " " + item.parent.modelo : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.parent?.sku && `SKU: ${item.parent.sku}`}
                        {s?.condicao && ` · ${s.condicao === "NOVO" ? "📦 Novo" : "🔄 Usado"}`}
                        {s?.cor && ` · ${s.cor}`}
                        {s?.capacidade && ` · ${s.capacidade}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(s?.precoCusto ?? item.precoUnit)}</p>
                      {s?.precoVenda && (
                        <p className="text-xs text-green-600">Venda: {formatCurrency(s.precoVenda)}</p>
                      )}
                    </div>
                  </div>

                  {/* Campos específicos */}
                  {s && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.imei && (
                        <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-mono text-blue-700">
                          📱 IMEI: {s.imei}
                        </span>
                      )}
                      {s.serialNumber && (
                        <span className="inline-flex items-center rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-1 text-xs font-mono text-purple-700">
                          🔢 Serial: {s.serialNumber}
                        </span>
                      )}
                      {s.nivelBateria != null && (
                        <span className="inline-flex items-center rounded-lg bg-green-50 border border-green-100 px-2.5 py-1 text-xs text-green-700">
                          🔋 {s.nivelBateria}%
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                        s.status === "EM_ESTOQUE" ? "bg-green-50 text-green-700 border border-green-100" :
                        s.status === "VENDIDO" ? "bg-red-50 text-red-700 border border-red-100" :
                        "bg-gray-50 text-gray-600 border border-gray-100"
                      }`}>
                        {s.status === "EM_ESTOQUE" ? "✅ Em estoque" :
                         s.status === "VENDIDO" ? "💰 Vendido" : s.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
