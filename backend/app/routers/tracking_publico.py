"""Consulta pública do estado da encomenda — não requer autenticação.

Resolve o problema central descrito na monografia: o cliente acompanha
a sua encomenda sem precisar de contactar a empresa.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Encomenda
from app.schemas.schemas import TrackingPublicoOut

router = APIRouter(prefix="/api/tracking", tags=["Tracking Público"])


@router.get("/{codigo_rastreio}", response_model=TrackingPublicoOut)
def consultar_encomenda(codigo_rastreio: str, db: Session = Depends(get_db)):
    encomenda = (
        db.query(Encomenda)
        .filter(Encomenda.codigo_rastreio == codigo_rastreio.strip().upper())
        .first()
    )
    if not encomenda:
        raise HTTPException(status_code=404, detail="Código de rastreio não encontrado")

    return TrackingPublicoOut(
        codigo_rastreio=encomenda.codigo_rastreio,
        descricao=encomenda.descricao,
        estado=encomenda.estado,
        origem=encomenda.origem,
        destino=encomenda.destino,
        previsao_chegada=encomenda.previsao_chegada,
        eventos=encomenda.eventos,
    )
