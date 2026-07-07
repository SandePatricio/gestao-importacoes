"""Job periódico: sincroniza o estado das encomendas com a API externa
de tracking e despacha as notificações pendentes.

Corresponde ao diagrama de sequência "Sincronização automática de tracking".
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import Encomenda
from app.models.enums import EstadoEncomenda, OrigemEvento
from app.services.tracking_service import consultar_tracking_externo
from app.services.encomenda_service import mudar_estado
from app.services.notification_service import processar_notificacoes_pendentes

logger = logging.getLogger(__name__)

ESTADOS_FINAIS = {EstadoEncomenda.ENTREGUE}


def sincronizar_encomendas():
    db = SessionLocal()
    try:
        activas = (
            db.query(Encomenda)
            .filter(
                Encomenda.tracking_externo.isnot(None),
                Encomenda.estado.notin_(ESTADOS_FINAIS),
            )
            .all()
        )
        actualizadas = 0
        for encomenda in activas:
            resultado = consultar_tracking_externo(encomenda.tracking_externo, encomenda.transportadora)
            if resultado and resultado["estado"] != encomenda.estado:
                mudar_estado(
                    db,
                    encomenda,
                    resultado["estado"],
                    descricao=resultado.get("descricao"),
                    localizacao=resultado.get("localizacao"),
                    origem_evento=OrigemEvento.API_TRACKING,
                )
                actualizadas += 1

        enviadas = processar_notificacoes_pendentes(db)
        logger.info(
            "Sincronização concluída: %d encomendas actualizadas, %d notificações enviadas.",
            actualizadas,
            enviadas,
        )
    finally:
        db.close()


def iniciar_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        sincronizar_encomendas,
        "interval",
        minutes=settings.TRACKING_SYNC_INTERVAL_MINUTES,
        id="sync_tracking",
    )
    scheduler.start()
    return scheduler
