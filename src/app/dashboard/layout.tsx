"use client";

import { useState } from "react";
import Sidebar, { MenuButton } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay escuro no mobile quando sidebar estiver aberta */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar - só aparece no mobile */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <MenuButton onClick={() => setSidebarOpen(true)} />
          <h1 className="text-lg font-bold text-gray-900">iCell ERP</h1>
        </header>

        {/* Conteúdo da página */}
        <main className={cn(
          "flex-1 overflow-y-auto",
          "p-4 md:p-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
