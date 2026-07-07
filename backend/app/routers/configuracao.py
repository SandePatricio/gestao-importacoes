from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual, apenas_admin
from app.models.models import Utilizador, LogConfiguracaoFrete
from app.schemas.schemas import (
    ConfiguracaoFreteOut,
    ConfiguracaoFreteUpdate,
    LogConfiguracaoFreteOut,
)
from app.services.config_service import obter_configuracao, actualizar_configuracao

router = APIRouter(prefix="/api/configuracao", tags=["Configuração"])


@router.get("/frete", response_model=ConfiguracaoFreteOut)
def obter_frete(
    db: Session = Depends(get_db),
    _: Utilizador = Depends(get_utilizador_actual),
):
    """Parâmetros do frete em vigor (qualquer utilizador autenticado, para o cálculo)."""
    return obter_configuracao(db)


@router.put("/frete", response_model=ConfiguracaoFreteOut)
def actualizar_frete(
    dados: ConfiguracaoFreteUpdate,
    db: Session = Depends(get_db),
    utilizador: Utilizador = Depends(apenas_admin),
):
    """Actualiza tarifa/divisor (apenas administradores) e regista quem alterou."""
    return actualizar_configuracao(db, dados.model_dump(), utilizador)


@router.get("/frete/logs", response_model=list[LogConfiguracaoFreteOut])
def listar_logs(
    db: Session = Depends(get_db),
    _: Utilizador = Depends(apenas_admin),
):
    """Histórico de alterações aos parâmetros do frete (apenas administradores)."""
    return (
        db.query(LogConfiguracaoFrete)
        .order_by(LogConfiguracaoFrete.criado_em.desc())
        .all()
    )
