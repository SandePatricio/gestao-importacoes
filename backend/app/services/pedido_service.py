"""Regras de negócio do processo de importação (Pedido).

Modela a fase que antecede a carga física: solicitação, cotação (após o
procurement), aprovação, pagamento e compra do produto. Ao ser recebida e
medida no armazém da China, o pedido dá origem a uma Encomenda, que segue o
fluxo físico já existente.
"""
import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import Pedido, ItemPedido, Encomenda, EventoTracking, Notificacao
from app.models.enums import (
    TipoPedido,
    EstadoPedido,
    EstadoEncomenda,
    OrigemEvento,
    CanalNotificacao,
)
from app.services.encomenda_service import gerar_codigo_rastreio, calcular_valor_frete

# Estado inicial conforme o modo do pedido
ESTADO_INICIAL = {
    TipoPedido.COM_COMPRA: EstadoPedido.SOLICITACAO_RECEBIDA,
    TipoPedido.ENVIO_DIRECTO: EstadoPedido.AGUARDA_ARMAZEM_CHINA,
}

# Transições válidas por tipo de pedido (origem → destinos permitidos)
_TRANSICOES = {
    TipoPedido.COM_COMPRA: {
        EstadoPedido.SOLICITACAO_RECEBIDA: [EstadoPedido.COTACAO_ENVIADA, EstadoPedido.CANCELADO],
        EstadoPedido.COTACAO_ENVIADA: [EstadoPedido.APROVADA, EstadoPedido.COTACAO_ENVIADA, EstadoPedido.CANCELADO],
        EstadoPedido.APROVADA: [EstadoPedido.PRODUTO_PAGO, EstadoPedido.CANCELADO],
        EstadoPedido.PRODUTO_PAGO: [EstadoPedido.PRODUTO_COMPRADO, EstadoPedido.CANCELADO],
        EstadoPedido.PRODUTO_COMPRADO: [EstadoPedido.RECEBIDO_MEDIDO, EstadoPedido.CANCELADO],
        EstadoPedido.RECEBIDO_MEDIDO: [EstadoPedido.EM_EXECUCAO],
        EstadoPedido.EM_EXECUCAO: [EstadoPedido.CONCLUIDO],
    },
    TipoPedido.ENVIO_DIRECTO: {
        EstadoPedido.AGUARDA_ARMAZEM_CHINA: [EstadoPedido.RECEBIDO_MEDIDO, EstadoPedido.CANCELADO],
        EstadoPedido.RECEBIDO_MEDIDO: [EstadoPedido.EM_EXECUCAO],
        EstadoPedido.EM_EXECUCAO: [EstadoPedido.CONCLUIDO],
    },
}

MENSAGENS_PEDIDO = {
    EstadoPedido.SOLICITACAO_RECEBIDA: "Recebemos a sua solicitação de importação.",
    EstadoPedido.COTACAO_ENVIADA: "A sua cotação está disponível. Aguardamos a aprovação.",
    EstadoPedido.APROVADA: "Cotação aprovada. Vamos avançar com a compra.",
    EstadoPedido.PRODUTO_PAGO: "Pagamento do produto confirmado.",
    EstadoPedido.PRODUTO_COMPRADO: "O produto foi comprado ao fornecedor.",
    EstadoPedido.AGUARDA_ARMAZEM_CHINA: "Aguardamos a chegada da mercadoria ao armazém na China.",
    EstadoPedido.RECEBIDO_MEDIDO: "Mercadoria recebida e medida no armazém da China.",
    EstadoPedido.CONCLUIDO: "Processo de importação concluído. Obrigado pela preferência!",
    EstadoPedido.CANCELADO: "O processo de importação foi cancelado.",
}


class TransicaoInvalida(Exception):
    """Tentativa de transição de estado não permitida para o tipo de pedido."""


def gerar_codigo_pedido(db: Session) -> str:
    """Gera um código único no formato PED-XXXXXX."""
    while True:
        codigo = "PED-" + secrets.token_hex(3).upper()
        if not db.query(Pedido).filter(Pedido.codigo == codigo).first():
            return codigo


def _notificar(db: Session, pedido: Pedido, mensagem: str) -> None:
    db.add(
        Notificacao(
            pedido_id=pedido.id,
            canal=CanalNotificacao.EMAIL,
            mensagem=f"[{pedido.codigo}] {mensagem}",
        )
    )


def transicoes_validas(pedido: Pedido) -> list[EstadoPedido]:
    return _TRANSICOES.get(pedido.tipo, {}).get(pedido.estado, [])


def mudar_estado_pedido(
    db: Session,
    pedido: Pedido,
    novo_estado: EstadoPedido,
    descricao: str | None = None,
    validar: bool = True,
) -> Pedido:
    """Aplica a transição, regista timestamps e notifica o cliente."""
    if validar and novo_estado not in transicoes_validas(pedido):
        raise TransicaoInvalida(
            f"Transição inválida: {pedido.estado.value} → {novo_estado.value}"
        )

    pedido.estado = novo_estado
    if novo_estado == EstadoPedido.COTACAO_ENVIADA:
        pedido.cotacao_enviada_em = datetime.now()
    elif novo_estado == EstadoPedido.APROVADA:
        pedido.aprovada_em = datetime.now()

    mensagem = descricao or MENSAGENS_PEDIDO.get(novo_estado)
    if mensagem:
        _notificar(db, pedido, mensagem)

    db.commit()
    db.refresh(pedido)
    return pedido


def criar_pedido(
    db: Session,
    *,
    cliente_id: int,
    tipo: TipoPedido,
    itens: list,
    origem: str,
    criado_por_id: int | None,
    tracking_externo: str | None = None,
    transportadora: str | None = None,
    previsao_chegada_china=None,
) -> Pedido:
    """Cria o pedido com o estado inicial do seu modo e regista a 1.ª notificação.

    `itens` é uma lista de ItemPedidoCreate (schemas).
    """
    pedido = Pedido(
        codigo=gerar_codigo_pedido(db),
        cliente_id=cliente_id,
        tipo=tipo,
        estado=ESTADO_INICIAL[tipo],
        origem=origem,
        criado_por_id=criado_por_id,
        tracking_externo=tracking_externo,
        transportadora=transportadora,
        previsao_chegada_china=previsao_chegada_china,
    )
    pedido.itens = [ItemPedido(**item.model_dump()) for item in itens]
    db.add(pedido)
    db.commit()
    db.refresh(pedido)

    _notificar(db, pedido, MENSAGENS_PEDIDO[pedido.estado])
    db.commit()
    db.refresh(pedido)
    return pedido


def criar_encomenda_do_pedido(db: Session, pedido: Pedido, dados) -> Encomenda:
    """Passo 5: cria a encomenda física a partir do pedido (peso/dimensões reais)
    e faz o pedido transitar para EM_EXECUCAO.

    `dados` é um ReceberMedirIn (schemas).
    """
    descricao = dados.descricao or "; ".join(
        f"{i.quantidade}× {i.descricao}" for i in pedido.itens
    ) or "Mercadoria importada"

    encomenda = Encomenda(
        codigo_rastreio=gerar_codigo_rastreio(db),
        pedido_id=pedido.id,
        cliente_id=pedido.cliente_id,
        descricao=descricao,
        peso_kg=dados.peso_kg,
        comprimento_cm=dados.comprimento_cm,
        largura_cm=dados.largura_cm,
        altura_cm=dados.altura_cm,
        awb=dados.awb,
        tracking_externo=dados.tracking_externo or pedido.tracking_externo,
        transportadora=dados.transportadora or pedido.transportadora,
        previsao_chegada=dados.previsao_chegada,
        estado=EstadoEncomenda.RECEBIDA_CHINA,
    )
    calcular_valor_frete(encomenda)
    db.add(encomenda)
    db.commit()
    db.refresh(encomenda)

    db.add(
        EventoTracking(
            encomenda_id=encomenda.id,
            estado=EstadoEncomenda.RECEBIDA_CHINA,
            descricao="Mercadoria recebida e medida no armazém da China.",
            origem_evento=OrigemEvento.MANUAL,
        )
    )
    db.commit()

    # Avança o pedido: medido → em execução (fase física a decorrer)
    mudar_estado_pedido(db, pedido, EstadoPedido.RECEBIDO_MEDIDO)
    mudar_estado_pedido(db, pedido, EstadoPedido.EM_EXECUCAO)

    db.refresh(encomenda)
    return encomenda
