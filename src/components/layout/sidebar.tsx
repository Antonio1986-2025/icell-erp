"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Produtos", href: "/dashboard/produtos", icon: "📱" },
  { label: "Estoque", href: "/dashboard/estoque", icon: "📦" },
  { label: "Laudos", href: "/dashboard/estoque/laudos", icon: "📋" },
  { label: "PDV", href: "/dashboard/vendas/pdv", icon: "🛒" },
  { label: "Vendas", href: "/dashboard/vendas", icon: "💰" },
  { label: "Pré-Vendas", href: "/dashboard/vendas/pre-vendas", icon: "📋" },
  { label: "Compras", href: "/dashboard/compras", icon: "🏪" },
  { label: "Clientes", href: "/dashboard/clientes", icon: "👥" },
  { label: "Fornecedores", href: "/dashboard/fornecedores", icon: "🏭" },
  { label: "Financeiro", href: "/dashboard/financeiro", icon: "💳" },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: "📈" },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: "⚙️" },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  function handleClick() {
    if (onClose) onClose();
  }

  return (
    <aside
      className={cn(
        // Desktop: sempre visível, posição fixa
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300",
        // Mobile: escondido por padrão, slide da esquerda quando aberto
        "-translate-x-full md:translate-x-0 md:static md:z-auto"
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">iCell ERP</h1>
          <p className="text-sm text-gray-500">Minha Loja</p>
        </div>
        {/* Botão fechar no mobile */}
        <button
          onClick={handleClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Fechar menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors md:py-2",
                "min-h-[44px]", // touch-friendly
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Rodapé - usuário */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 md:h-8 md:w-8">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@loja.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Botão hamburguer separado pra usar na TopBar
export function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
      aria-label="Abrir menu"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
