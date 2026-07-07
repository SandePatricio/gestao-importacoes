"""Regras de negócio das encomendas: geração de código, mudança de estado."""
import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Encomenda, EventoTracking, Notificacao
from app.models.enums import EstadoEncomenda, OrigemEvento, CanalNotificacao, EstadoPedido

MENSAGENS_ESTADO = {
    EstadoEncomenda.RECEBIDA_CHINA: "A sua encomenda foi recebida no nosso armazém na China.",
    EstadoEncomenda.EMBARCADA: "A sua encomenda foi embarcada no voo para Moçambique.",
    EstadoEncomenda.EM_TRANSITO: "A sua encomenda está em trânsito.",
    EstadoEncomenda.CHEGOU_MOCAMBIQUE: "A sua encomenda chegou a Moçambique.",
    EstadoEncomenda.DESALFANDEGADA: "A sua encomenda foi desalfandegada.",
    EstadoEncomenda.DISPONIVEL_LEVANTAMENTO: "A sua encomenda está disponível para levantamento.",
    EstadoEncomenda.ENTREGUE: "A sua encomenda foi entregue. Obrigado pela preferência!",
    EstadoEncomenda.ATRASADA: "A sua encomenda sofreu um atraso. Pedimos desculpa pelo incómodo.",
}


def calcular_valor_frete(encomenda: Encomenda) -> None:
    """Calcula o valor do frete a partir do peso cobrável × tarifa por kg.

    O peso cobrável é o maior entre o peso real e o peso volumétrico.
    Só recalcula quando há peso/dimensões; caso contrário mantém o valor
    introduzido manualmente (encomendas sem pesagem).
    """
    cobravel = encomenda.peso_cobravel_kg
    if cobravel is not None:
        encomenda.valor_frete = round(cobravel * settings.TARIFA_POR_KG, 2)


def gerar_codigo_rastreio(db: Session) -> str:
    """Gera um código único no formato CNX-XXXXXX."""
    while True:
        codigo = "CNX-" + secrets.token_hex(3).upper()
        if not db.query(Encomenda).filter(Encomenda.codigo_rastreio == codigo).first():
            return codigo


def mudar_estado(
    db: Session,
    encomenda: Encomenda,
    novo_estado: EstadoEncomenda,
    descricao: str | None = None,
    localizacao: str | None = None,
    origem_evento: OrigemEvento = OrigemEvento.MANUAL,
) -> EventoTracking:
    """Regista a transição de estado, o evento de tracking e a notificação ao cliente."""
    encomenda.estado = novo_estado

    # Marca o início da disponibilidade em Maputo (base do cálculo da multa)
    if novo_estado == EstadoEncomenda.DISPONIVEL_LEVANTAMENTO and not encomenda.data_disponivel:
        encomenda.data_disponivel = datetime.now()

    # Encomenda entregue → o processo de importação fica concluído
    if novo_estado == EstadoEncomenda.ENTREGUE and encomenda.pedido is not None:
        if encomenda.pedido.estado != EstadoPedido.CONCLUIDO:
            encomenda.pedido.estado = EstadoPedido.CONCLUIDO

    evento = EventoTracking(
        encomenda_id=encomenda.id,
        estado=novo_estado,
        descricao=descricao or MENSAGENS_ESTADO.get(novo_estado),
        localizacao=localizacao,
        origem_evento=origem_evento,
    )
    db.add(evento)

    mensagem = MENSAGENS_ESTADO.get(novo_estado)
    if mensagem:
        db.add(
            Notificacao(
                encomenda_id=encomenda.id,
                canal=CanalNotificacao.EMAIL,
                mensagem=f"[{encomenda.codigo_rastreio}] {mensagem}",
            )
        )

    db.commit()
    db.refresh(evento)
    return evento
