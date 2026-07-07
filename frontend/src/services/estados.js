// Estados da encomenda — espelham o enum EstadoEncomenda do backend
// e o diagrama de estados da monografia.

export const ESTADOS = {
  REGISTADA: { rotulo: "Registada", cor: "bg-neutral-100 text-neutral-700" },
  RECEBIDA_CHINA: { rotulo: "Recebida na China", cor: "bg-blue-100 text-blue-700" },
  EMBARCADA: { rotulo: "Embarcada", cor: "bg-indigo-100 text-indigo-700" },
  EM_TRANSITO: { rotulo: "Em trânsito", cor: "bg-violet-100 text-violet-700" },
  CHEGOU_MOCAMBIQUE: { rotulo: "Chegou a Moçambique", cor: "bg-cyan-100 text-cyan-700" },
  DESALFANDEGADA: { rotulo: "Desalfandegada", cor: "bg-teal-100 text-teal-700" },
  DISPONIVEL_LEVANTAMENTO: { rotulo: "Disponível p/ levantamento", cor: "bg-amber-100 text-amber-700" },
  ENTREGUE: { rotulo: "Entregue", cor: "bg-green-100 text-green-700" },
  ATRASADA: { rotulo: "Atrasada", cor: "bg-red-100 text-red-700" },
};

export function rotuloEstado(estado) {
  return ESTADOS[estado]?.rotulo ?? estado;
}

export function corEstado(estado) {
  return ESTADOS[estado]?.cor ?? "bg-neutral-100 text-neutral-700";
}

export function formatarData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export function mzn(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

// Estados do pedido (processo de importação) — espelham o enum EstadoPedido.
export const ESTADOS_PEDIDO = {
  SOLICITACAO_RECEBIDA: { rotulo: "Solicitação recebida", cor: "bg-neutral-100 text-neutral-700" },
  COTACAO_ENVIADA: { rotulo: "Cotação enviada", cor: "bg-blue-100 text-blue-700" },
  APROVADA: { rotulo: "Aprovada", cor: "bg-indigo-100 text-indigo-700" },
  PRODUTO_PAGO: { rotulo: "Produto pago", cor: "bg-violet-100 text-violet-700" },
  PRODUTO_COMPRADO: { rotulo: "Produto comprado", cor: "bg-cyan-100 text-cyan-700" },
  AGUARDA_ARMAZEM_CHINA: { rotulo: "Aguarda armazém China", cor: "bg-amber-100 text-amber-700" },
  RECEBIDO_MEDIDO: { rotulo: "Recebido e medido", cor: "bg-teal-100 text-teal-700" },
  EM_EXECUCAO: { rotulo: "Em execução", cor: "bg-sky-100 text-sky-700" },
  CONCLUIDO: { rotulo: "Concluído", cor: "bg-green-100 text-green-700" },
  CANCELADO: { rotulo: "Cancelado", cor: "bg-red-100 text-red-700" },
};

export const TIPOS_PEDIDO = {
  COM_COMPRA: "Compra pela Connex",
  ENVIO_DIRECTO: "Envio directo do cliente",
};

export const CATEGORIAS_ANEXO = {
  FOTO_PRODUTO: "Foto do produto",
  FOTO_ARMAZEM: "Foto no armazém",
  FACTURA_FORNECEDOR: "Factura do fornecedor",
  COMPROVATIVO_PAGAMENTO: "Comprovativo de pagamento",
  DOC_ALFANDEGA: "Documento de alfândega",
  OUTRO: "Outro",
};

export function rotuloPedido(estado) {
  return ESTADOS_PEDIDO[estado]?.rotulo ?? estado;
}

export function corPedido(estado) {
  return ESTADOS_PEDIDO[estado]?.cor ?? "bg-neutral-100 text-neutral-700";
}
