"use client";

import { useRouter } from "next/navigation";

export default function PeriodSelector({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const router = useRouter();

  function handleChange(periodo: string) {
    const params = new URLSearchParams(window.location.search);
    if (periodo && periodo !== "6") {
      params.set("periodo", periodo);
    } else {
      params.delete("periodo");
    }
    const qs = params.toString();
    router.push(`/dashboard/relatorios${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Período:</label>
      <select
        name="periodo"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="1">Último mês</option>
        <option value="3">Últimos 3 meses</option>
        <option value="6">Últimos 6 meses</option>
        <option value="12">Último ano</option>
      </select>
    </div>
  );
}
