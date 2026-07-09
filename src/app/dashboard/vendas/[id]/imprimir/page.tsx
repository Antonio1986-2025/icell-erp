import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ImprimirVendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return <p className="p-6 text-center text-gray-500">Acesso não autorizado</p>;

  const tenantId = (session.user as any).tenantId;
  const { id } = await params;

  const [venda, tenant] = await Promise.all([
    prisma.transaction.findFirst({
      where: { id, tenantId },
      include: {
        cliente: { select: { nome: true, cpf: true, telefone: true, endereco: true } },
        vendedor: { select: { nome: true } },
        items: {
          include: {
            stockItem: { select: { imei: true, serialNumber: true, cor: true, capacidade: true, condicao: true } },
            parent: { select: { nome: true, marca: true, modelo: true } },
          },
        },
        payments: { select: { metodo: true, valor: true, parcelas: true } },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);

  if (!venda) notFound();

  const saidaItems = venda.items.filter((i) => i.tipo === "SAIDA");
  const entradaItems = venda.items.filter((i) => i.tipo === "ENTRADA");
  const hasImei = saidaItems.some((i) => i.stockItem?.imei);

  return (
    <html>
      <head>
        <title>Venda #{venda.numero} - Documentos</title>
        <meta charSet="utf-8" />
        <style>{`
          @page { margin: 15mm 20mm; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; color: #000; font-size: 11pt; line-height: 1.5; }
          .page { max-width: 190mm; margin: 0 auto; padding: 10mm 0; }
          .page-break { page-break-before: always; }
          h1 { font-size: 16pt; text-align: center; margin-bottom: 2mm; }
          h2 { font-size: 13pt; margin: 5mm 0 3mm; border-bottom: 2px solid #000; padding-bottom: 1mm; }
          h3 { font-size: 11pt; margin: 3mm 0 2mm; }
          .header { text-align: center; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 3px double #000; }
          .header h1 { font-size: 18pt; text-transform: uppercase; }
          .header p { font-size: 9pt; margin-top: 1mm; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 4mm; }
          .info-box { border: 1px solid #000; padding: 3mm; flex: 1; margin: 0 1mm; }
          .info-box:first-child { margin-left: 0; }
          .info-box:last-child { margin-right: 0; }
          .info-box label { font-size: 8pt; text-transform: uppercase; color: #555; display: block; }
          .info-box span { font-size: 10pt; font-weight: bold; display: block; margin-top: 0.5mm; }
          table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
          th, td { border: 1px solid #000; padding: 2mm 3mm; text-align: left; font-size: 9pt; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 8pt; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals { margin-top: 3mm; text-align: right; }
          .totals p { margin: 1mm 0; }
          .totals .grand { font-size: 14pt; font-weight: bold; border-top: 2px solid #000; padding-top: 1mm; }
          .warranty { margin-top: 5mm; padding: 3mm; border: 2px solid #000; }
          .warranty h2 { border: none; text-align: center; font-size: 14pt; }
          .warranty p { margin: 1.5mm 0; font-size: 9pt; }
          .warranty ul { margin: 1.5mm 0; padding-left: 5mm; font-size: 9pt; }
          .warranty li { margin: 0.5mm 0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 10mm; }
          .signature-box { text-align: center; flex: 1; }
          .signature-box .line { border-top: 1px solid #000; width: 80%; margin: 15mm auto 2mm; }
          .signature-box p { font-size: 9pt; }
          .footer { text-align: center; margin-top: 10mm; font-size: 8pt; color: #666; }
          .disclaimer { font-size: 8pt; color: #666; margin-top: 2mm; font-style: italic; }
          @media print {
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="no-print" style={{ textAlign: "center", marginBottom: "5mm" }}>
            <button onClick={() => window.print()} style={{
              padding: "8px 24px", fontSize: "14px", cursor: "pointer",
              background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "8px",
              fontWeight: "bold"
            }}>
              🖨️ Imprimir / Salvar PDF
            </button>
            <p style={{ marginTop: "4px", fontSize: "10px", color: "#666" }}>
              Use Ctrl+P ou o botão acima. Configure margens como "Mínimo" e desmarque cabeçalho/rodapé.
            </p>
          </div>

          {/* ===== CONTRATO DE VENDA ===== */}
          <div className="header">
            <h1>{tenant?.nome || "MINHA LOJA"}</h1>
            <p>
              {tenant?.cnpj && `CNPJ: ${tenant.cnpj}  |  `}
              {tenant?.endereco && `${tenant.endereco}  |  `}
              {tenant?.telefone && `Tel: ${tenant.telefone}`}
              {tenant?.email && `  |  ${tenant.email}`}
            </p>
          </div>

          <h1>CONTRATO DE COMPRA E VENDA</h1>
          <p className="text-center" style={{ fontSize: "9pt", marginBottom: "4mm" }}>
            Nº {venda.numero} — {new Date(venda.createdAt).toLocaleDateString("pt-BR")}
          </p>

          {/* Dados das Partes */}
          <h2>1. DAS PARTES</h2>
          <div className="info-grid">
            <div className="info-box">
              <label>Vendedor (Loja)</label>
              <span>{tenant?.nome || "Minha Loja"}</span>
              {tenant?.cnpj && <p style={{fontSize:"9pt",marginTop:"1mm"}}>CNPJ: {tenant.cnpj}</p>}
              {tenant?.endereco && <p style={{fontSize:"9pt"}}>{tenant.endereco}</p>}
            </div>
            <div className="info-box">
              <label>Comprador (Cliente)</label>
              <span>{venda.cliente?.nome || "—"}</span>
              {venda.cliente?.cpf && <p style={{fontSize:"9pt",marginTop:"1mm"}}>CPF: {venda.cliente.cpf}</p>}
              {venda.cliente?.telefone && <p style={{fontSize:"9pt"}}>Tel: {venda.cliente.telefone}</p>}
              {venda.cliente?.endereco && <p style={{fontSize:"9pt"}}>{venda.cliente.endereco}</p>}
            </div>
          </div>

          {/* Itens */}
          <h2>2. DOS PRODUTOS</h2>
          <table>
            <thead>
              <tr>
                <th style={{width:"5%"}}>#</th>
                <th style={{width:"38%"}}>Produto</th>
                {hasImei && <th style={{width:"20%"}}>IMEI / Serial</th>}
                <th style={{width:"12%"}}>Qtd</th>
                <th style={{width:"12%"}}>Valor Unit.</th>
                <th style={{width:"13%"}}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {saidaItems.length === 0 ? (
                <tr><td colSpan={hasImei ? 6 : 4} className="text-center" style={{padding:"5mm",color:"#666"}}>Nenhum item</td></tr>
              ) : saidaItems.map((item, idx) => {
                const s = item.stockItem;
                const nome = [
                  item.parent?.marca || "",
                  item.parent?.nome || "Produto",
                  item.parent?.modelo || "",
                  s?.cor ? `(${s.cor})` : "",
                  s?.capacidade || "",
                ].filter(Boolean).join(" ");
                return (
                  <tr key={item.id || idx}>
                    <td className="text-center">{idx + 1}</td>
                    <td>
                      {nome}
                      {s?.condicao && <span style={{fontSize:"8pt",color:"#666"}}> ({s.condicao === "NOVO" ? "Novo" : "Usado"})</span>}
                    </td>
                    {hasImei && <td style={{fontSize:"8pt",fontFamily:"monospace"}}>{s?.imei || s?.serialNumber || "—"}</td>}
                    <td className="text-center">{item.quantidade}</td>
                    <td className="text-right">{formatCurrency(item.precoUnit)}</td>
                    <td className="text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Trade-in */}
          {entradaItems.length > 0 && (
            <>
              <h3 style={{marginTop:"3mm",color:"#555"}}>Entrada (Trade-in)</h3>
              <table>
                <thead>
                  <tr>
                    <th style={{width:"5%"}}>#</th>
                    <th>Aparelho</th>
                    <th style={{width:"20%"}}>IMEI</th>
                    <th style={{width:"20%"}}>Valor Abatido</th>
                  </tr>
                </thead>
                <tbody>
                  {entradaItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{item.parent?.nome || "Aparelho"}</td>
                      <td style={{fontSize:"8pt",fontFamily:"monospace"}}>{item.stockItem?.imei || "—"}</td>
                      <td className="text-right" style={{color:"#16a34a"}}>{formatCurrency(Math.abs(item.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Totais */}
          <div className="totals">
            <p>Subtotal: <strong>{formatCurrency(venda.subtotal)}</strong></p>
            {venda.desconto > 0 && <p>Desconto: <strong>-{formatCurrency(venda.desconto)}</strong></p>}
            <p className="grand">Total: {formatCurrency(venda.total)}</p>
          </div>

          {/* Pagamento */}
          {venda.payments?.length > 0 && (
            <>
              <h2>3. DO PAGAMENTO</h2>
              <table>
                <thead>
                  <tr>
                    <th>Forma</th>
                    <th>Valor</th>
                    <th>Parcelas</th>
                  </tr>
                </thead>
                <tbody>
                  {venda.payments.map((pag, idx) => (
                    <tr key={idx}>
                      <td>{pag.metodo}</td>
                      <td className="text-right">{formatCurrency(pag.valor)}</td>
                      <td className="text-center">{pag.parcelas > 1 ? `${pag.parcelas}x` : "À vista"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Observações */}
          {venda.observacoes && (
            <>
              <h2>4. OBSERVAÇÕES</h2>
              <p style={{fontSize:"9pt",padding:"2mm",border:"1px solid #ccc",borderRadius:"2mm"}}>{venda.observacoes}</p>
            </>
          )}

          {/* Assinaturas */}
          <h2>5. DO RECIBO</h2>
          <p style={{fontSize:"9pt",marginBottom:"3mm"}}>
            Declaro que recebi o(s) produto(s) descrito(s) acima em perfeito estado, estando de acordo com os termos e condições da venda.
          </p>
          <div className="signatures">
            <div className="signature-box">
              <div className="line"></div>
              <p>{tenant?.nome || "Loja"}<br /><span style={{fontSize:"8pt"}}>Vendedor</span></p>
            </div>
            <div className="signature-box">
              <div className="line"></div>
              <p>{venda.cliente?.nome || "Cliente"}<br /><span style={{fontSize:"8pt"}}>Comprador</span></p>
            </div>
          </div>

          {/* ===== TERMO DE GARANTIA ===== */}
          <div className="page-break"></div>

          <div className="warranty">
            <h1 style={{marginBottom:"3mm"}}>TERMO DE GARANTIA</h1>

            <table style={{marginBottom:"3mm"}}>
              <tbody>
                <tr><td style={{fontWeight:"bold",width:"35%"}}>Cliente:</td><td>{venda.cliente?.nome || "—"}</td></tr>
                {venda.cliente?.cpf && <tr><td style={{fontWeight:"bold"}}>CPF:</td><td>{venda.cliente.cpf}</td></tr>}
                <tr><td style={{fontWeight:"bold"}}>Loja:</td><td>{tenant?.nome || "Minha Loja"}</td></tr>
                {tenant?.cnpj && <tr><td style={{fontWeight:"bold"}}>CNPJ:</td><td>{tenant.cnpj}</td></tr>}
                <tr><td style={{fontWeight:"bold"}}>Data da Compra:</td><td>{new Date(venda.createdAt).toLocaleDateString("pt-BR")}</td></tr>
                <tr><td style={{fontWeight:"bold"}}>Valor Total:</td><td>{formatCurrency(venda.total)}</td></tr>
              </tbody>
            </table>

            {saidaItems.map((item, idx) => {
              const s = item.stockItem;
              const nome = [
                item.parent?.marca || "",
                item.parent?.nome || "Produto",
                s?.cor ? `(${s.cor})` : "",
                s?.capacidade || "",
              ].filter(Boolean).join(" ");
              return (
                <div key={item.id || idx} style={{
                  border: "1px solid #000", padding: "2mm", marginBottom: "2mm", borderRadius: "1mm"
                }}>
                  <p><strong>Produto {idx + 1}:</strong> {nome}</p>
                  {s?.imei && <p><strong>IMEI:</strong> {s.imei}</p>}
                  {s?.serialNumber && <p><strong>Serial:</strong> {s.serialNumber}</p>}
                </div>
              );
            })}

            <h2>CONDIÇÕES DA GARANTIA</h2>
            <ul>
              <li>O prazo de garantia é de <strong>90 (noventa) dias</strong> para defeitos de fabricação, contados a partir da data de emissão desta nota fiscal, conforme Lei 8.078/90 (Código de Defesa do Consumidor).</li>
              <li>A garantia cobre exclusivamente defeitos de fabricação do produto, não cobrindo danos decorrentes de:</li>
              <li>💧 Queda, impacto, mau uso ou armazenamento inadequado;</li>
              <li>🌊 Contato com líquidos ou umidade excessiva;</li>
              <li>⚡ Sobrecarga elétrica ou uso de carregadores não originais;</li>
              <li>🔧 Desmontagem ou reparo por técnico não autorizado;</li>
              <li>🦠 Danos por vírus, software malicioso ou alteração de sistema operacional;</li>
              <li>📅 Desgaste natural da bateria (vida útil do componente).</li>
              <li>Para acionar a garantia, é necessária a apresentação deste termo juntamente com a nota fiscal de compra.</li>
              <li>A bateria possui garantia de <strong>90 (noventa) dias</strong> contra vício de fabricação, não cobrindo perda natural de capacidade ao longo do tempo.</li>
              <li>Acessórios (carregador, cabo, fone) possuem garantia de <strong>30 (trinta) dias</strong>.</li>
            </ul>

            <p style={{marginTop:"3mm",fontSize:"9pt",textAlign:"center",fontWeight:"bold"}}>
              Produto testado e aprovado no ato da compra.
            </p>

            <div className="signatures">
              <div className="signature-box">
                <div className="line"></div>
                <p>{tenant?.nome || "Loja"}</p>
              </div>
              <div className="signature-box">
                <div className="line"></div>
                <p>{venda.cliente?.nome || "Cliente"}</p>
              </div>
            </div>

            <div className="footer">
              <p>Documento gerado em {new Date().toLocaleString("pt-BR")}</p>
              <p className="disclaimer">
                Este documento é parte integrante da Nota Fiscal de Venda. Guarde-o junto com a nota fiscal.
              </p>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `window.onload=function(){setTimeout(function(){window.print()},500)}` }} />
      </body>
    </html>
  );
}
