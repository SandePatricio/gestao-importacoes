"""Gestão do processo de importação (Pedido): solicitação, cotação, aprovação,
compra do produto e criação da encomenda física quando a mercadoria é medida.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.models.models import Pedido, ItemPedido, Cliente, Factura, Utilizador
from app.models.enums import TipoPedido, EstadoPedido, TipoFactura, EstadoFactura
from app.schemas.schemas import (
    PedidoCreate,
    PedidoOut,
    PedidoDetalheOut,
    CotacaoUpdate,
    MudancaEstadoPedido,
    ReceberMedirIn,
    ItemPedidoCreate,
    ItemPedidoOut,
    FacturaOut,
    FacturaProdutoCreate,
    EncomendaDetalheOut,
)
from app.services import pedido_service
from app.services.factura_service import gerar_numero_factura

router = APIRouter(
    prefix="/api/pedidos",
    tags=["Pedidos"],
    dependencies=[Depends(get_utilizador_actual)],
)


def _obter_pedido(db: Session, pedido_id: int) -> Pedido:
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido


@router.get("", response_model=list[PedidoOut])
def listar_pedidos(
    estado: EstadoPedido | None = None,
    tipo: TipoPedido | None = None,
    cliente_id: int | None = None,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Pedido)
    if not incluir_inactivos:
        query = query.filter(Pedido.activo.is_(True))
    if estado:
        query = query.filter(Pedido.estado == estado)
    if tipo:
        query = query.filter(Pedido.tipo == tipo)
    if cliente_id:
        query = query.filter(Pedido.cliente_id == cliente_id)
    return query.order_by(Pedido.criado_em.desc()).all()


@router.post("", response_model=PedidoDetalheOut, status_code=201)
def criar_pedido(
    dados: PedidoCreate,
    utilizador: Utilizador = Depends(get_utilizador_actual),
    db: Session = Depends(get_db),
):
    if not db.get(Cliente, dados.cliente_id):
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    return pedido_service.criar_pedido(
        db,
        cliente_id=dados.cliente_id,
        tipo=dados.tipo,
        itens=dados.itens,
        origem="OPERADOR",
        criado_por_id=utilizador.id,
        tracking_externo=dados.tracking_externo,
        transportadora=dados.transportadora,
        previsao_chegada_china=dados.previsao_chegada_china,
    )


@router.get("/{pedido_id}", response_model=PedidoDetalheOut)
def obter_pedido(pedido_id: int, db: Session = Depends(get_db)):
    return _obter_pedido(db, pedido_id)


@router.delete("/{pedido_id}", response_model=PedidoDetalheOut)
def inactivar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    """Apaga (inactiva) o pedido: passa a estar oculto nas listagens sem perder
    o histórico. É reversível através de `reactivar`.
    """
    pedido = _obter_pedido(db, pedido_id)
    pedido.activo = False
    db.commit()
    db.refresh(pedido)
    return pedido


@router.post("/{pedido_id}/reactivar", response_model=PedidoDetalheOut)
def reactivar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    """Repõe um pedido previamente inactivado."""
    pedido = _obter_pedido(db, pedido_id)
    pedido.activo = True
    db.commit()
    db.refresh(pedido)
    return pedido


@router.put("/{pedido_id}/cotacao", response_model=PedidoDetalheOut)
def definir_cotacao(pedido_id: int, dados: CotacaoUpdate, db: Session = Depends(get_db)):
    """Preenche a cotação (após o procurement) e envia-a para aprovação."""
    pedido = _obter_pedido(db, pedido_id)
    if pedido.tipo != TipoPedido.COM_COMPRA:
        raise HTTPException(status_code=400, detail="Só pedidos com compra têm cotação de produto.")
    if pedido.estado not in (EstadoPedido.SOLICITACAO_RECEBIDA, EstadoPedido.COTACAO_ENVIADA):
        raise HTTPException(status_code=409, detail="A cotação já não pode ser alterada neste estado.")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(pedido, campo, valor)

    if pedido.estado == EstadoPedido.SOLICITACAO_RECEBIDA:
        pedido_service.mudar_estado_pedido(db, pedido, EstadoPedido.COTACAO_ENVIADA)
    else:
        db.commit()
        db.refresh(pedido)
    return pedido


@router.post("/{pedido_id}/aprovar", response_model=PedidoDetalheOut)
def aprovar_cotacao(pedido_id: int, db: Session = Depends(get_db)):
    pedido = _obter_pedido(db, pedido_id)
    try:
        return pedido_service.mudar_estado_pedido(db, pedido, EstadoPedido.APROVADA)
    except pedido_service.TransicaoInvalida as erro:
        raise HTTPException(status_code=409, detail=str(erro))


@router.post("/{pedido_id}/estado", response_model=PedidoDetalheOut)
def mudar_estado(pedido_id: int, dados: MudancaEstadoPedido, db: Session = Depends(get_db)):
    """Transição genérica (ex.: PRODUTO_COMPRADO, CANCELADO)."""
    pedido = _obter_pedido(db, pedido_id)
    try:
        return pedido_service.mudar_estado_pedido(db, pedido, dados.estado, dados.descricao)
    except pedido_service.TransicaoInvalida as erro:
        raise HTTPException(status_code=409, detail=str(erro))


@router.post("/{pedido_id}/factura-produto", response_model=FacturaOut, status_code=201)
def emitir_factura_produto(pedido_id: int, dados: FacturaProdutoCreate, db: Session = Depends(get_db)):
    pedido = _obter_pedido(db, pedido_id)
    if pedido.tipo != TipoPedido.COM_COMPRA:
        raise HTTPException(status_code=400, detail="Só pedidos com compra têm factura de produto.")

    # Evita facturas de produto duplicadas para o mesmo pedido.
    existente = next(
        (f for f in pedido.facturas if f.tipo == TipoFactura.PRODUTO and f.estado != EstadoFactura.CANCELADA),
        None,
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"Este pedido já tem a factura de produto {existente.numero}.",
        )

    valor = dados.valor_total if dados.valor_total is not None else pedido.total_pagar_agora_mzn
    if valor is None:
        raise HTTPException(
            status_code=400,
            detail="Preencha a cotação (preço do produto/serviço) antes de facturar.",
        )

    factura = Factura(
        numero=gerar_numero_factura(db),
        tipo=TipoFactura.PRODUTO,
        pedido_id=pedido.id,
        valor_total=float(valor),
    )
    db.add(factura)
    db.commit()
    db.refresh(factura)
    return factura


@router.post("/{pedido_id}/receber-medir", response_model=EncomendaDetalheOut, status_code=201)
def receber_medir(pedido_id: int, dados: ReceberMedirIn, db: Session = Depends(get_db)):
    """Passo 5: regista a recepção/medição e cria a encomenda física."""
    pedido = _obter_pedido(db, pedido_id)
    estados_validos = (EstadoPedido.PRODUTO_COMPRADO, EstadoPedido.AGUARDA_ARMAZEM_CHINA)
    if pedido.estado not in estados_validos:
        raise HTTPException(
            status_code=409,
            detail="O pedido ainda não está pronto para recepção no armazém da China.",
        )
    if pedido.encomenda is not None:
        raise HTTPException(status_code=409, detail="Este pedido já tem encomenda associada.")

    return pedido_service.criar_encomenda_do_pedido(db, pedido, dados)


# ---------- Itens do pedido ----------

@router.post("/{pedido_id}/itens", response_model=ItemPedidoOut, status_code=201)
def adicionar_item(pedido_id: int, dados: ItemPedidoCreate, db: Session = Depends(get_db)):
    _obter_pedido(db, pedido_id)
    item = ItemPedido(pedido_id=pedido_id, **dados.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{pedido_id}/itens/{item_id}", response_model=ItemPedidoOut)
def actualizar_item(pedido_id: int, item_id: int, dados: ItemPedidoCreate, db: Session = Depends(get_db)):
    item = db.get(ItemPedido, item_id)
    if not item or item.pedido_id != pedido_id:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    for campo, valor in dados.model_dump().items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{pedido_id}/itens/{item_id}", status_code=204)
def remover_item(pedido_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.get(ItemPedido, item_id)
    if not item or item.pedido_id != pedido_id:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(item)
    db.commit()
