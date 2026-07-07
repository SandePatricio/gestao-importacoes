import enum


class PerfilUtilizador(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERADOR = "OPERADOR"


class EstadoEncomenda(str, enum.Enum):
    REGISTADA = "REGISTADA"
    RECEBIDA_CHINA = "RECEBIDA_CHINA"
    EMBARCADA = "EMBARCADA"
    EM_TRANSITO = "EM_TRANSITO"
    CHEGOU_MOCAMBIQUE = "CHEGOU_MOCAMBIQUE"
    DESALFANDEGADA = "DESALFANDEGADA"
    DISPONIVEL_LEVANTAMENTO = "DISPONIVEL_LEVANTAMENTO"
    ENTREGUE = "ENTREGUE"
    ATRASADA = "ATRASADA"


class OrigemEvento(str, enum.Enum):
    MANUAL = "MANUAL"
    API_TRACKING = "API_TRACKING"
    CLIENTE = "CLIENTE"


class TipoPedido(str, enum.Enum):
    COM_COMPRA = "COM_COMPRA"        # Connex compra o produto ao fornecedor (modo A)
    ENVIO_DIRECTO = "ENVIO_DIRECTO"  # cliente compra e envia para o armazém (modo B)


class EstadoPedido(str, enum.Enum):
    SOLICITACAO_RECEBIDA = "SOLICITACAO_RECEBIDA"      # passo 1 (modo A)
    COTACAO_ENVIADA = "COTACAO_ENVIADA"               # passo 2 — aguarda aprovação
    APROVADA = "APROVADA"                             # cliente aceitou a cotação
    PRODUTO_PAGO = "PRODUTO_PAGO"                     # passo 3 — produto + serviço pagos
    PRODUTO_COMPRADO = "PRODUTO_COMPRADO"             # passo 4 (modo A)
    AGUARDA_ARMAZEM_CHINA = "AGUARDA_ARMAZEM_CHINA"   # início do modo B
    RECEBIDO_MEDIDO = "RECEBIDO_MEDIDO"               # passo 5 — gera a encomenda física
    EM_EXECUCAO = "EM_EXECUCAO"                       # encomenda em curso (fase física)
    CONCLUIDO = "CONCLUIDO"                           # entregue
    CANCELADO = "CANCELADO"


class TipoFactura(str, enum.Enum):
    PRODUTO = "PRODUTO"        # produto + serviço de compra (passo 3)
    TRANSPORTE = "TRANSPORTE"  # frete aéreo calculado após pesagem (passo 6)


class CategoriaAnexo(str, enum.Enum):
    FOTO_PRODUTO = "FOTO_PRODUTO"                    # foto do produto pedido (cliente)
    FOTO_ARMAZEM = "FOTO_ARMAZEM"                    # fotos reais no armazém China (passo 5)
    FACTURA_FORNECEDOR = "FACTURA_FORNECEDOR"        # invoice do fornecedor
    COMPROVATIVO_PAGAMENTO = "COMPROVATIVO_PAGAMENTO"  # comprovativo carregado pelo cliente
    DOC_ALFANDEGA = "DOC_ALFANDEGA"                  # despacho/desalfandegamento
    OUTRO = "OUTRO"


class EstadoFactura(str, enum.Enum):
    PENDENTE = "PENDENTE"
    PAGA = "PAGA"
    CANCELADA = "CANCELADA"


class CanalNotificacao(str, enum.Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"
    SMS = "SMS"


class EstadoNotificacao(str, enum.Enum):
    PENDENTE = "PENDENTE"
    ENVIADA = "ENVIADA"
    FALHADA = "FALHADA"
