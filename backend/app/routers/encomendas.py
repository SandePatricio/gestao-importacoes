from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.models.models import Encomenda, Cliente, EventoTracking
from app.models.enums import EstadoEncomenda, OrigemEvento
from app.schemas.schemas import (
    EncomendaCreate,
    EncomendaUpdate,
    EncomendaOut,
    EncomendaDetalheOut,
    MudancaEstado,
    EventoTrackingOut,
)
from app.services.encomenda_service import (
    gerar_codigo_rastreio,
    mudar_estado,
    calcular_valor_frete,
)
from app.services.config_service import obter_configuracao

router = APIRouter(
    prefix="/api/encomendas",
    tags=["Encomendas"],
    dependencies=[Depends(get_utilizador_actual)],
)


@router.get("", response_model=list[EncomendaOut])
def listar_encomendas(
    estado: EstadoEncomenda | None = None,
    cliente_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Encomenda)
    if estado:
        query = query.filter(Encomenda.estado == estado)
    if cliente_id:
        query = query.filter(Encomenda.cliente_id == cliente_id)
    return query.order_by(Encomenda.data_registo.desc()).all()


@router.get("/parametros-frete")
def parametros_frete(db: Session = Depends(get_db)):
    """Tarifa por kg e divisor volumétrico em vigor (usados no cálculo do frete)."""
    cfg = obter_configuracao(db)
    return {
        "tarifa_por_kg": float(cfg.tarifa_por_kg),
        "divisor_volumetrico": int(cfg.divisor_volumetrico),
    }


@router.post("", response_model=EncomendaDetalheOut, status_code=201)
def criar_encomenda(dados: EncomendaCreate, db: Session = Depends(get_db)):
    if not db.get(Cliente, dados.cliente_id):
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    encomenda = Encomenda(
        **dados.model_dump(),
        codigo_rastreio=gerar_codigo_rastreio(db),
    )
    calcular_valor_frete(encomenda)
    db.add(encomenda)
    db.commit()
    db.refresh(encomenda)

    # Primeiro evento do histórico de tracking
    db.add(
        EventoTracking(
            encomenda_id=encomenda.id,
            estado=EstadoEncomenda.REGISTADA,
            descricao="Encomenda registada no sistema.",
            origem_evento=OrigemEvento.MANUAL,
        )
    )
    db.commit()
    db.refresh(encomenda)
    return encomenda


@router.get("/{encomenda_id}", response_model=EncomendaDetalheOut)
def obter_encomenda(encomenda_id: int, db: Session = Depends(get_db)):
    encomenda = db.get(Encomenda, encomenda_id)
    if not encomenda:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    return encomenda


@router.put("/{encomenda_id}", response_model=EncomendaDetalheOut)
def actualizar_encomenda(encomenda_id: int, dados: EncomendaUpdate, db: Session = Depends(get_db)):
    encomenda = db.get(Encomenda, encomenda_id)
    if not encomenda:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(encomenda, campo, valor)
    calcular_valor_frete(encomenda)
    db.commit()
    db.refresh(encomenda)
    return encomenda


@router.post("/{encomenda_id}/estado", response_model=EventoTrackingOut)
def mudar_estado_encomenda(encomenda_id: int, dados: MudancaEstado, db: Session = Depends(get_db)):
    encomenda = db.get(Encomenda, encomenda_id)
    if not encomenda:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    if encomenda.estado == dados.estado:
        raise HTTPException(status_code=409, detail="A encomenda já se encontra neste estado")

    return mudar_estado(db, encomenda, dados.estado, dados.descricao, dados.localizacao)
