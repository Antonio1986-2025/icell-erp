"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-900">iCell ERP</h1>
        <p className="text-sm text-gray-500">Minha Loja</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
            A
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Admin</p>
            <p className="text-xs text-gray-500">admin@loja.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
