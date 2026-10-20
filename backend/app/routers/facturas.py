from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.models.models import Factura, Encomenda
from app.models.enums import EstadoFactura, TipoFactura, EstadoPedido
from app.schemas.schemas import FacturaCreate, FacturaOut, FacturaResumoOut, FacturaDetalheOut
from app.services.config_service import obter_configuracao
from app.services.factura_service import gerar_numero_factura
from app.services import pedido_service

router = APIRouter(
    prefix="/api/facturas",
    tags=["Facturas"],
    dependencies=[Depends(get_utilizador_actual)],
)


@router.get("", response_model=list[FacturaResumoOut])
def listar_facturas(estado: EstadoFactura | None = None, db: Session = Depends(get_db)):
    query = db.query(Factura)
    if estado:
        query = query.filter(Factura.estado == estado)

    resumos: list[FacturaResumoOut] = []
    for f in query.order_by(Factura.data_emissao.desc()).all():
        # Uma factura liga-se a uma encomenda (transporte) ou a um pedido (produto)
        if f.encomenda is not None:
            cliente, codigo = f.encomenda.cliente, f.encomenda.codigo_rastreio
        elif f.pedido is not None:
            cliente, codigo = f.pedido.cliente, f.pedido.codigo
        else:
            continue
        resumos.append(
            FacturaResumoOut(
                id=f.id,
                numero=f.numero,
                tipo=f.tipo,
                valor_total=float(f.valor_total),
                estado=f.estado,
                data_emissao=f.data_emissao,
                encomenda_id=f.encomenda_id,
                pedido_id=f.pedido_id,
                codigo_rastreio=codigo,
                cliente_id=cliente.id,
                cliente_nome=cliente.nome,
            )
        )
    return resumos


@router.get("/{factura_id}", response_model=FacturaDetalheOut)
def obter_factura(factura_id: int, db: Session = Depends(get_db)):
    factura = db.get(Factura, factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura não encontrada")
    return factura


@router.post("", response_model=FacturaOut, status_code=201)
def emitir_factura(dados: FacturaCreate, db: Session = Depends(get_db)):
    encomenda = db.get(Encomenda, dados.encomenda_id)
    if not encomenda:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")

    # Uma encomenda só pode ter uma factura de transporte activa (não cancelada).
    existente = (
        db.query(Factura)
        .filter(
            Factura.encomenda_id == dados.encomenda_id,
            Factura.tipo == TipoFactura.TRANSPORTE,
            Factura.estado != EstadoFactura.CANCELADA,
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"Esta encomenda já tem a factura {existente.numero}. Cancele-a antes de emitir outra.",
        )

    # Sem valor explícito, usa o frete já calculado da encomenda (ISPC não cobra IVA).
    valor_total = dados.valor_total if dados.valor_total is not None else encomenda.valor_frete
    if valor_total is None:
        raise HTTPException(
            status_code=400,
            detail="A encomenda não tem frete calculado. Indique o peso/dimensões ou um valor.",
        )
    valor_total = float(valor_total)

    # Congela a base de cálculo quando o valor corresponde ao frete por peso
    # (independentemente de ter sido enviado ou pré-preenchido). Caso contrário, é manual.
    frete_calculado = encomenda.valor_frete
    por_peso = (
        encomenda.peso_cobravel_kg
        and frete_calculado is not None
        and abs(valor_total - float(frete_calculado)) < 0.01
    )
    peso_cobravel = encomenda.peso_cobravel_kg if por_peso else None
    tarifa_aplicada = float(obter_configuracao(db).tarifa_por_kg) if por_peso else None

    factura = Factura(
        numero=gerar_numero_factura(db),
        tipo=TipoFactura.TRANSPORTE,
        encomenda_id=dados.encomenda_id,
        valor_total=valor_total,
        peso_cobravel_kg=peso_cobravel,
        tarifa_aplicada=tarifa_aplicada,
    )
    db.add(factura)
    db.commit()
    db.refresh(factura)
    return factura


@router.post("/{factura_id}/pagar", response_model=FacturaOut)
def marcar_como_paga(factura_id: int, db: Session = Depends(get_db)):
    factura = db.get(Factura, factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura não encontrada")
    if factura.estado != EstadoFactura.PENDENTE:
        raise HTTPException(status_code=409, detail="A factura não está pendente")
    factura.estado = EstadoFactura.PAGA
    db.commit()

    # Pagar a factura do produto confirma o passo 3 e avança o pedido
    if (
        factura.tipo == TipoFactura.PRODUTO
        and factura.pedido is not None
        and factura.pedido.estado == EstadoPedido.APROVADA
    ):
        pedido_service.mudar_estado_pedido(db, factura.pedido, EstadoPedido.PRODUTO_PAGO)

    db.refresh(factura)
    return factura


@router.post("/{factura_id}/cancelar", response_model=FacturaOut)
def cancelar_factura(factura_id: int, db: Session = Depends(get_db)):
    """Anula uma factura pendente (ex.: valor errado), permitindo emitir outra."""
    factura = db.get(Factura, factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura não encontrada")
    if factura.estado != EstadoFactura.PENDENTE:
        raise HTTPException(status_code=409, detail="Só é possível cancelar facturas pendentes")
    factura.estado = EstadoFactura.CANCELADA
    db.commit()
    db.refresh(factura)
    return factura
