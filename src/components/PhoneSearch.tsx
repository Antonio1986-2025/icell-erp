"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import phoneModels from "@/data/phone-models.json";

type Category = { id: string; nome: string };

export type PhoneModel = {
  marca: string;
  modelo: string;
  nome: string;
  categoria: string;
};

type Props = {
  categories: Category[];
  onSelect: (model: PhoneModel, categoryId: string) => void;
  onClear: () => void;
  selected: PhoneModel | null;
};

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function PhoneSearch({ categories, onSelect, onClear, selected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhoneModel[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allModels = useMemo(() => phoneModels as PhoneModel[], []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }
    const q = query.toLowerCase().trim();
    const filtered = allModels
      .filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          m.marca.toLowerCase().includes(q) ||
          m.modelo.toLowerCase().includes(q),
      )
      .slice(0, 12);
    setResults(filtered);
    setOpen(filtered.length > 0);
    setHighlightIndex(-1);
  }, [query, allModels]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectModel(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function selectModel(model: PhoneModel) {
    const cat = categories.find(
      (c) => c.nome.toLowerCase() === model.categoria.toLowerCase(),
    );
    onSelect(model, cat?.id || "");
    setQuery(model.nome);
    setOpen(false);
  }

  function handleClear() {
    setQuery("");
    setOpen(false);
    onClear();
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Buscar Modelo de Celular
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) onClear();
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
          placeholder="Digite iPhone, Galaxy, Moto..."
          className={`w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none ${
            selected
              ? "border-green-400 bg-green-50 text-green-800"
              : "border-gray-300 focus:border-blue-500"
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
          {results.map((model, i) => (
            <li
              key={`${model.modelo}-${model.nome}-${i}`}
              onClick={() => selectModel(model)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === highlightIndex
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400 w-16 shrink-0">
                  {model.marca}
                </span>
                <span className="flex-1">{highlightMatch(model.nome, query)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 w-16 shrink-0">
                  {model.modelo}
                </span>
                <span className="text-xs text-gray-400">
                  Categoria: {model.categoria}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
          <span>✓ Modelo selecionado:</span>
          <span className="font-medium">{selected.marca}</span>
          <span>{selected.nome}</span>
          <span className="text-gray-400">({selected.modelo})</span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto text-red-500 hover:text-red-700 text-xs underline"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
