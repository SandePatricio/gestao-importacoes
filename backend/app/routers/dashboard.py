from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.models.models import Encomenda, Cliente, Factura
from app.models.enums import EstadoEncomenda, EstadoFactura

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_utilizador_actual)],
)


@router.get("/resumo")
def resumo(db: Session = Depends(get_db)):
    por_estado = dict(
        db.query(Encomenda.estado, func.count(Encomenda.id)).group_by(Encomenda.estado).all()
    )
    estados_activos = [
        EstadoEncomenda.REGISTADA,
        EstadoEncomenda.RECEBIDA_CHINA,
        EstadoEncomenda.EMBARCADA,
        EstadoEncomenda.EM_TRANSITO,
        EstadoEncomenda.CHEGOU_MOCAMBIQUE,
        EstadoEncomenda.DESALFANDEGADA,
        EstadoEncomenda.DISPONIVEL_LEVANTAMENTO,
    ]
    return {
        "total_encomendas": db.query(Encomenda).count(),
        "encomendas_activas": sum(por_estado.get(e, 0) for e in estados_activos),
        "encomendas_atrasadas": por_estado.get(EstadoEncomenda.ATRASADA, 0),
        "encomendas_entregues": por_estado.get(EstadoEncomenda.ENTREGUE, 0),
        "total_clientes": db.query(Cliente).count(),
        "facturas_pendentes": db.query(Factura)
        .filter(Factura.estado == EstadoFactura.PENDENTE)
        .count(),
        "por_estado": {estado.value: total for estado, total in por_estado.items()},
    }
