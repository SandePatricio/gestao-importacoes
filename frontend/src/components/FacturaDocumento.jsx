import { QRCodeSVG } from "qrcode.react";
import { formatarData } from "../services/estados";

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 });
}

// Documento da factura — formato A4 imprimível. Presentational: recebe a
// factura (FacturaDetalheOut) e a identidade da empresa. Usado na gestão e no portal.
export default function FacturaDocumento({ factura, empresa }) {
  const enc = factura.encomenda;
  const pedido = factura.pedido;
  const cliente = enc?.cliente ?? pedido?.cliente;
  const ehProduto = factura.tipo === "PRODUTO";
  // Dados de pagamento configurados (só as linhas preenchidas)
  const pagamento = [
    ["Banco", empresa?.banco_nome],
    ["Titular", empresa?.banco_titular],
    ["N.º de conta", empresa?.banco_conta],
    ["NIB", empresa?.banco_nib],
    ["Pagamento móvel", empresa?.pagamento_movel],
  ].filter(([, valor]) => valor);

  return (
    <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border-0 print:rounded-none p-8 relative overflow-hidden">
      {factura.estado === "PAGA" && (
        <div className="absolute top-10 right-[-40px] rotate-45 bg-green-600 text-white text-xs font-bold tracking-widest px-12 py-1.5">
          PAGA
        </div>
      )}
      {factura.estado === "CANCELADA" && (
        <div className="absolute top-10 right-[-40px] rotate-45 bg-neutral-400 text-white text-xs font-bold tracking-widest px-12 py-1.5">
          CANCELADA
        </div>
      )}

      <div className="flex justify-between items-start border-b border-neutral-200 pb-6 mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{empresa?.empresa_nome || "Connex Importações, Lda."}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Transporte aéreo de mercadorias China → Moçambique<br />
            {empresa?.empresa_endereco || "Maputo, Moçambique"}
            {empresa?.empresa_nuit && <><br />NUIT: {empresa.empresa_nuit}</>}
            {empresa?.empresa_telefone && <><br />Tel.: {empresa.empresa_telefone}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-neutral-400">Factura</p>
          <p className="font-mono text-lg font-bold text-neutral-900">{factura.numero}</p>
          <p className="text-sm text-neutral-500">{formatarData(factura.data_emissao)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Facturar a</p>
          <p className="font-semibold text-neutral-900">{cliente?.nome}</p>
          <p className="text-sm text-neutral-600">{cliente?.telefone}</p>
          {cliente?.email && <p className="text-sm text-neutral-600">{cliente.email}</p>}
          {cliente?.nuit && <p className="text-sm text-neutral-600">NUIT: {cliente.nuit}</p>}
          {cliente?.endereco && <p className="text-sm text-neutral-600">{cliente.endereco}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">
            {ehProduto ? "Referente ao pedido" : "Referente à encomenda"}
          </p>
          {enc ? (
            <>
              <p className="font-mono font-semibold text-neutral-900">{enc.codigo_rastreio}</p>
              <p className="text-sm text-neutral-600">{enc.origem} → {enc.destino}</p>
            </>
          ) : (
            <>
              <p className="font-mono font-semibold text-neutral-900">{pedido?.codigo}</p>
              <p className="text-sm text-neutral-600">Compra de produto + serviço</p>
            </>
          )}
        </div>
      </div>

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left text-neutral-600">
            <th className="py-2 font-medium">Descrição</th>
            <th className="py-2 font-medium text-right">Peso</th>
            <th className="py-2 font-medium text-right">Valor (MZN)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-100">
            <td className="py-3">
              {enc
                ? enc.descricao
                : `Produto + serviço de compra${pedido?.codigo ? ` (pedido ${pedido.codigo})` : ""}`}
            </td>
            <td className="py-3 text-right">
              {enc
                ? enc.peso_cobravel_kg
                  ? `${enc.peso_cobravel_kg} kg`
                  : enc.peso_kg
                  ? `${enc.peso_kg} kg`
                  : "—"
                : "—"}
            </td>
            <td className="py-3 text-right font-medium">{mzn(factura.valor_total)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="py-3 text-right font-semibold text-neutral-900">Total a pagar</td>
            <td className="py-3 text-right text-lg font-bold text-neutral-900">{mzn(factura.valor_total)} MZN</td>
          </tr>
        </tfoot>
      </table>

      {ehProduto ? (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-8 text-sm">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Composição</p>
          <ul className="space-y-1 text-neutral-600">
            <li className="flex justify-between"><span>Preço do produto</span><span>{mzn(pedido?.preco_produto_mzn ?? 0)} MZN</span></li>
            <li className="flex justify-between"><span>Serviço de compra</span><span>{mzn(pedido?.servico_compra_mzn ?? 0)} MZN</span></li>
            <li className="flex justify-between border-t border-neutral-200 pt-1 mt-1 font-semibold text-neutral-900">
              <span>Total</span><span>{mzn(factura.valor_total)} MZN</span>
            </li>
          </ul>
          <p className="text-xs text-neutral-400 mt-2">O transporte é facturado à parte, após a pesagem da mercadoria.</p>
        </div>
      ) : (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-8 text-sm">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Base de cálculo do frete</p>
          {factura.tarifa_aplicada && factura.peso_cobravel_kg ? (
            <ul className="space-y-1 text-neutral-600">
              <li className="flex justify-between">
                <span>Peso real (balança)</span>
                <span>{enc.peso_kg ? `${enc.peso_kg} kg` : "—"}</span>
              </li>
              {enc.comprimento_cm && enc.largura_cm && enc.altura_cm && (
                <li className="flex justify-between">
                  <span>Peso volumétrico ({enc.comprimento_cm}×{enc.largura_cm}×{enc.altura_cm} cm)</span>
                  <span>{enc.peso_volumetrico_kg ? `${enc.peso_volumetrico_kg} kg` : "—"}</span>
                </li>
              )}
              <li className="flex justify-between font-medium text-neutral-900">
                <span>Peso cobrável (o maior)</span>
                <span>{factura.peso_cobravel_kg} kg</span>
              </li>
              <li className="flex justify-between">
                <span>Tarifa aplicada</span>
                <span>{mzn(factura.tarifa_aplicada)} MZN/kg</span>
              </li>
              <li className="flex justify-between border-t border-neutral-200 pt-1 mt-1 font-semibold text-neutral-900">
                <span>{factura.peso_cobravel_kg} kg × {mzn(factura.tarifa_aplicada)}</span>
                <span>{mzn(factura.valor_total)} MZN</span>
              </li>
            </ul>
          ) : (
            <p className="text-neutral-600">Valor definido manualmente (sem cálculo automático por peso).</p>
          )}
        </div>
      )}

      {pagamento.length > 0 && factura.estado !== "CANCELADA" && (
        <div className="border border-neutral-300 rounded-xl px-4 py-3 mb-8 text-sm break-inside-avoid">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Dados para pagamento</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            {pagamento.map(([rotulo, valor]) => (
              <div key={rotulo} className="contents">
                <dt className="text-neutral-500">{rotulo}</dt>
                <dd className="font-mono font-medium text-neutral-900">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-neutral-400 mt-2">
            Indique o n.º da factura ({factura.numero}) na referência da transferência e envie o comprovativo.
          </p>
        </div>
      )}

      <div className="flex items-end justify-between gap-6 border-t border-neutral-100 pt-5">
        <p className="text-xs text-neutral-400 max-w-sm">
          Documento processado pelo Sistema de Gestão de Encomendas Aéreas da
          Connex Importações.
          {enc && ` Aponte a câmara do telemóvel ao código QR para acompanhar a encomenda ${enc.codigo_rastreio} em tempo real.`}
        </p>
        {enc && (
          <div className="text-center shrink-0">
            <QRCodeSVG
              value={`${window.location.origin}/rastrear?codigo=${enc.codigo_rastreio}`}
              size={96}
              level="M"
            />
            <p className="text-[10px] text-neutral-400 mt-1.5 font-mono">{enc.codigo_rastreio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
