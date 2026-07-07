"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    vendasHoje: 0,
    vendasMes: 0,
    totalVendasMes: 0,
    emEstoque: 0,
    reservado: 0,
    laudosPendentes: 0,
    contasPagar: 0,
    contasReceber: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [vendasRes, estoqueRes, laudosRes, pagarRes, receberRes] =
          await Promise.all([
            fetch("/api/vendas?tipo=VENDA&status=CONCLUIDA"),
            fetch("/api/estoque?status=EM_ESTOQUE"),
            fetch("/api/laudos?status=PENDENTE"),
            fetch("/api/financeiro/contas-pagar?status=PENDENTE"),
            fetch("/api/financeiro/contas-receber?status=PENDENTE"),
          ]);

        const vendas = await vendasRes.json();
        const estoque = await estoqueRes.json();
        const laudos = await laudosRes.json();
        const pagar = await pagarRes.json();
        const receber = await receberRes.json();

        const agora = new Date();
        const inicioHoje = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          agora.getDate()
        );
        const inicioMes = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          1
        );

        const vendasArray = Array.isArray(vendas) ? vendas : [];
        const vendasHoje = vendasArray.filter(
          (v: any) => new Date(v.createdAt) >= inicioHoje
        );
        const vendasMes = vendasArray.filter(
          (v: any) => new Date(v.createdAt) >= inicioMes
        );

        setStats({
          vendasHoje: vendasHoje.length,
          vendasMes: vendasMes.length,
          totalVendasMes: vendasMes.reduce(
            (s: number, v: any) => s + (v.total || 0),
            0
          ),
          emEstoque: Array.isArray(estoque) ? estoque.length : estoque.total || 0,
          reservado: 0,
          laudosPendentes: Array.isArray(laudos) ? laudos.length : 0,
          contasPagar: Array.isArray(pagar)
            ? pagar.reduce((s: number, c: any) => s + (c.valor || 0), 0)
            : 0,
          contasReceber: Array.isArray(receber)
            ? receber.reduce((s: number, c: any) => s + (c.valor || 0), 0)
            : 0,
        });
      } catch {
        // Silencia erros no carregamento inicial
      }
      setLoading(false);
    }
    carregar();
  }, []);

  const cards = [
    {
      titulo: "Vendas Hoje",
      valor: loading ? "..." : `${stats.vendasHoje}`,
      cor: "text-green-600",
      bg: "bg-green-50",
      link: "/dashboard/vendas",
    },
    {
      titulo: "Vendas do Mês",
      valor: loading ? "..." : `${stats.vendasMes}`,
      cor: "text-blue-600",
      bg: "bg-blue-50",
      link: "/dashboard/vendas",
    },
    {
      titulo: "Faturamento do Mês",
      valor: loading ? "..." : formatCurrency(stats.totalVendasMes),
      cor: "text-green-600",
      bg: "bg-green-50",
      link: "/dashboard/vendas",
    },
    {
      titulo: "Produtos em Estoque",
      valor: loading ? "..." : `${stats.emEstoque}`,
      cor: "text-blue-600",
      bg: "bg-blue-50",
      link: "/dashboard/estoque",
    },
    {
      titulo: "Laudos Pendentes",
      valor: loading ? "..." : `${stats.laudosPendentes}`,
      cor: stats.laudosPendentes > 0 ? "text-amber-600" : "text-gray-600",
      bg: stats.laudosPendentes > 0 ? "bg-amber-50" : "bg-gray-50",
      link: "/dashboard/estoque/laudos",
    },
    {
      titulo: "Contas a Pagar",
      valor: loading ? "..." : formatCurrency(stats.contasPagar),
      cor: "text-red-600",
      bg: "bg-red-50",
      link: "/dashboard/financeiro",
    },
    {
      titulo: "Contas a Receber",
      valor: loading ? "..." : formatCurrency(stats.contasReceber),
      cor: "text-green-600",
      bg: "bg-green-50",
      link: "/dashboard/financeiro",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Resumo rápido da sua loja
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.titulo}
            href={card.link}
            className={`rounded-lg border border-gray-200 ${card.bg} p-5 transition hover:shadow-sm`}
          >
            <p className="text-sm font-medium text-gray-600">{card.titulo}</p>
            <p className={`mt-2 text-3xl font-bold ${card.cor}`}>
              {card.valor}
            </p>
          </Link>
        ))}
      </div>

      {/* Atalhos rápidos */}
      <div className="mt-10">
        <h2 className="text-sm font-bold uppercase text-gray-700">
          Atalhos Rápidos
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Nova Venda (PDV)", href: "/dashboard/vendas/pdv", icon: "🛒" },
            { label: "Novo Produto", href: "/dashboard/produtos/novo", icon: "📱" },
            { label: "Novo Laudo", href: "/dashboard/estoque/laudos/novo", icon: "📋" },
            { label: "Novo Cliente", href: "/dashboard/clientes/novo", icon: "👤" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:shadow-sm"
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
