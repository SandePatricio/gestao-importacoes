import { mzn, formatarData, TIPOS_PEDIDO } from "../services/estados";

// Documento de cotação (proposta) imprimível — formato A4, semelhante à factura.
// Presentational: recebe o pedido e a identidade da empresa. NÃO é uma factura.
export default function CotacaoDocumento({ pedido, empresa }) {
  const produto = Number(pedido.preco_produto_mzn) || 0;
  const servico = Number(pedido.servico_compra_mzn) || 0;
  const transporte = Number(pedido.estimativa_transporte_mzn) || 0;
  const pagarAgora = produto + servico;
  const totalEstimado = pagarAgora + transporte;

  return (
    <div className="bg-white rounded-2xl shadow-sm print:border-0 print:rounded-none p-8 relative overflow-hidden">
      <div className="absolute top-10 right-[-44px] rotate-45 bg-blue-600 text-white text-xs font-bold tracking-widest px-12 py-1.5">
        COTAÇÃO
      </div>

      <div className="flex justify-between items-start border-b border-neutral-200 pb-6 mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{empresa?.empresa_nome || "Connex Importações, Lda."}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Importação e transporte aéreo China → Moçambique<br />
            {empresa?.empresa_endereco || "Maputo, Moçambique"}
            {empresa?.empresa_nuit && <><br />NUIT: {empresa.empresa_nuit}</>}
            {empresa?.empresa_telefone && <><br />Tel.: {empresa.empresa_telefone}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-neutral-400">Cotação / Proposta</p>
          <p className="font-mono text-lg font-bold text-neutral-900">{pedido.codigo}</p>
          <p className="text-sm text-neutral-500">{formatarData(pedido.cotacao_enviada_em || pedido.criado_em)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Para</p>
          <p className="font-semibold text-neutral-900">{pedido.cliente?.nome}</p>
          <p className="text-sm text-neutral-600">{pedido.cliente?.telefone}</p>
          {pedido.cliente?.email && <p className="text-sm text-neutral-600">{pedido.cliente.email}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Modalidade</p>
          <p className="font-semibold text-neutral-900">{TIPOS_PEDIDO[pedido.tipo] ?? pedido.tipo}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left text-neutral-600">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-center">Qtd.</th>
            <th className="py-2 font-medium">Modelo / tamanho / cor</th>
          </tr>
        </thead>
        <tbody>
          {pedido.itens?.map((it) => (
            <tr key={it.id} className="border-b border-neutral-100">
              <td className="py-2.5">{it.descricao}</td>
              <td className="py-2.5 text-center">{it.quantidade}</td>
              <td className="py-2.5 text-neutral-600">{it.variacao || "—"}</td>
            </tr>
          ))}
          {(pedido.itens?.length ?? 0) === 0 && (
            <tr><td colSpan={3} className="py-3 text-neutral-500">Sem itens.</td></tr>
          )}
        </tbody>
      </table>

      <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-6 text-sm">
        <ul className="space-y-1 text-neutral-600">
          <li className="flex justify-between"><span>Preço do produto</span><span>{mzn(produto)}</span></li>
          <li className="flex justify-between"><span>Serviço de compra</span><span>{mzn(servico)}</span></li>
          <li className="flex justify-between border-t border-neutral-200 pt-1 mt-1 font-semibold text-neutral-900">
            <span>A pagar agora (produto + serviço)</span><span>{mzn(pagarAgora)}</span>
          </li>
          <li className="flex justify-between pt-2"><span>Transporte (estimativa)</span><span>{mzn(transporte)}</span></li>
          <li className="flex justify-between border-t border-neutral-200 pt-1 mt-1 text-base font-bold text-neutral-900">
            <span>Total estimado</span><span>{mzn(totalEstimado)}</span>
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-6 text-sm">
        O valor do <strong>transporte é apenas uma estimativa</strong>. O valor final é confirmado
        depois de a mercadoria chegar ao armazém na China e ser <strong>pesada e medida</strong>,
        sendo então emitida a factura de transporte.
      </div>

      {pedido.cotacao_observacoes && (
        <div className="mb-6 text-sm">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Observações</p>
          <p className="text-neutral-700 whitespace-pre-line">{pedido.cotacao_observacoes}</p>
        </div>
      )}

      <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-5">
        Documento de cotação processado pelo Sistema de Gestão da {empresa?.empresa_nome || "Connex Importações"}.
        Não constitui factura. Para avançar, aprove a cotação no portal do cliente.
      </p>
    </div>
  );
}
