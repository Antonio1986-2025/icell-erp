"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface LaudoDetalhe {
  id: string;
  aparelhoNome: string;
  imei: string | null;
  serialNumber: string | null;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  capacidade: string | null;
  nivelBateria: number | null;
  condicao: string | null;
  fotos: string | null;
  checklistResult: string | null;
  valorEstimado: number | null;
  observacoes: string | null;
  status: string;
  createdAt: string;
  cliente: { nome: string; cpf: string | null; telefone: string | null } | null;
}

export default function ImprimirTradeInPage() {
  const params = useParams();
  const [laudo, setLaudo] = useState<LaudoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const printedRef = useRef(false);

  useEffect(() => {
    async function carregar() {
      const res = await fetch(`/api/trade-in/${params.id}`);
      if (res.ok) setLaudo(await res.json());
      setLoading(false);
    }
    carregar();
  }, [params.id]);

  useEffect(() => {
    if (!loading && laudo && !printedRef.current) {
      printedRef.current = true;
      setTimeout(() => window.print(), 600);
    }
  }, [loading, laudo]);

  if (loading) return <p className="p-8 text-center text-sm text-gray-500">Carregando...</p>;
  if (!laudo) return <p className="p-8 text-center text-sm text-red-600">Trade-in não encontrado</p>;

  const fotos = laudo.fotos ? JSON.parse(laudo.fotos) : {};
  const checklist = laudo.checklistResult ? JSON.parse(laudo.checklistResult) : {};

  const condicaoLabels: Record<string, string> = {
    NOVO: "Novo", COMO_NOVO: "Como Novo", BOM: "Bom", REGULAR: "Regular", RUIM: "Ruim",
  };

  return (
    <div className="print-laudo">
      <style>{`
        @page { size: A4; margin: 12mm; }
        .print-laudo {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #fff;
          padding: 20px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px; }
        .header .logo h1 { font-size: 22px; color: #2563eb; letter-spacing: 1px; margin: 0; }
        .header .logo p { font-size: 9px; color: #666; margin: 0; }
        .header .numero { text-align: right; font-size: 11px; }
        .header .numero strong { font-size: 14px; color: #2563eb; }
        .status-tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #dbeafe; color: #1e40af; margin-bottom: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; }
        .info-grid .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-grid .value { font-weight: 600; color: #0f172a; }
        h2.st { font-size: 13px; text-transform: uppercase; color: #2563eb; margin-bottom: 6px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .fotos-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 14px; }
        .foto-card { border: 1.5px solid #e2e8f0; border-radius: 6px; overflow: hidden; text-align: center; background: #f8fafc; }
        .foto-card .img-area { height: 95px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; }
        .foto-card .img-area img { width: 100%; height: 100%; object-fit: cover; }
        .foto-card .legenda { font-size: 9px; padding: 3px 0; color: #475569; font-weight: 600; text-transform: uppercase; }
        .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 15px; margin-bottom: 14px; }
        .ci { display: flex; align-items: center; gap: 6px; padding: 2px 4px; font-size: 11px; }
        .ci .st { width: 28px; height: 18px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex-shrink: 0; }
        .st-ok { background: #dcfce7; color: #166534; } .st-nok { background: #fee2e2; color: #991b1b; } .st-na { background: #f1f5f9; color: #64748b; }
        .obs-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 11px; }
        .obs-box h3 { font-size: 11px; color: #92400e; margin-bottom: 3px; }
        .class-box { border: 2px solid #2563eb; border-radius: 8px; padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
        .class-box .nota { font-size: 28px; font-weight: 800; color: #2563eb; }
        .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 16px 0 10px; }
        .assinaturas .linha { border-top: 1px solid #333; padding-top: 5px; margin-top: 30px; text-align: center; font-size: 10.5px; }
        .assinaturas .linha strong { font-size: 11px; }
        .local-data { text-align: center; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .footer { text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
        @media screen { .print-laudo { max-width: 210mm; margin: 0 auto; } }
        @media print { .print-laudo { padding: 0; } .no-print { display: none !important; } }
      `}</style>

      <div className="no-print" style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }}>
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>

      <div className="header">
        <div className="logo">
          <h1>iCELL STORE</h1>
          <p>Minha Loja<br />CNPJ: 00.000.000/0000-00</p>
        </div>
        <div className="numero">
          <strong>TRADE-IN</strong><br />
          Nº {laudo.id.slice(0, 8).toUpperCase()}<br />
          <span style={{ color: "#64748b", fontSize: 10 }}>{new Date(laudo.createdAt).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>

      <span className="status-tag">{laudo.status === "CONCLUIDO" ? "✓ Concluído" : laudo.status === "PENDENTE" ? "Pendente" : "Cancelado"}</span>

      <div className="info-grid">
        <div><div className="label">Aparelho</div><div className="value">{laudo.aparelhoNome}</div></div>
        <div><div className="label">Condição</div><div className="value">{condicaoLabels[laudo.condicao || ""] || laudo.condicao || "—"}</div></div>
        {laudo.imei && <div><div className="label">IMEI</div><div className="value">{laudo.imei}</div></div>}
        {laudo.cor && <div><div className="label">Cor</div><div className="value">{laudo.cor}</div></div>}
        {laudo.capacidade && <div><div className="label">Capacidade</div><div className="value">{laudo.capacidade}</div></div>}
        {laudo.nivelBateria !== null && <div><div className="label">Bateria</div><div className="value">{laudo.nivelBateria}%</div></div>}
        {laudo.valorEstimado && <div><div className="label">Valor</div><div className="value">R$ {laudo.valorEstimado.toFixed(2)}</div></div>}
        <div><div className="label">Cliente</div><div className="value">{laudo.cliente?.nome || "—"}</div></div>
        {laudo.cliente?.cpf && <div><div className="label">CPF</div><div className="value">{laudo.cliente.cpf}</div></div>}
      </div>

      <h2 className="st">Registro Fotográfico</h2>
      <div className="fotos-grid">
        {["frente", "verso", "lateral_esq", "lateral_dir", "imei_tela"].map((key) => (
          <div key={key} className="foto-card">
            <div className="img-area">
              {fotos[key] ? <img src={fotos[key]} alt={key} /> : "Sem foto"}
            </div>
            <div className="legenda">{key === "imei_tela" ? "IMEI na Tela" : key}</div>
          </div>
        ))}
      </div>

      <h2 className="st">Checklist de Inspeção</h2>
      <div className="checklist-grid">
        {Object.entries(checklist).map(([id, valor]) => (
          <div key={id} className="ci">
            <span className={`st st-${(valor as string).toLowerCase()}`}>{valor as string}</span>
            <span>{id}</span>
          </div>
        ))}
      </div>

      {laudo.observacoes && (
        <div className="obs-box">
          <h3>Observações</h3>
          <p>{laudo.observacoes}</p>
        </div>
      )}

      <div className="class-box">
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Condição Geral</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{condicaoLabels[laudo.condicao || ""] || laudo.condicao || "—"}</div>
        </div>
        <div className="nota">
          {Object.values(checklist).filter((v) => v === "OK").length}/{Object.keys(checklist).length}
        </div>
      </div>

      <div className="local-data">
        {new Date(laudo.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
      </div>

      <div className="assinaturas">
        <div>
          <div className="linha">
            <strong>VENDEDOR (Cliente)</strong><br />
            {laudo.cliente?.nome || "_________________________"}<br />
            {laudo.cliente?.cpf ? `CPF: ${laudo.cliente.cpf}` : ""}
          </div>
        </div>
        <div>
          <div className="linha">
            <strong>AVALIADOR (Loja)</strong><br />
            _________________________<br />
            iCELL STORE
          </div>
        </div>
      </div>

      <div className="footer">
        <p>Documento gerado eletronicamente pelo iCell ERP</p>
        <p>Consulte a autenticidade em icell.app/trade-in/{laudo.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </div>
  );
}
