"""Integração com a API externa de tracking (17TRACK por omissão).

O sistema nunca consulta a API externa no momento do pedido do cliente:
o estado é guardado localmente e sincronizado periodicamente pelo job
em app/jobs/sync_tracking.py, respeitando os limites de quota da API.
"""
import logging

import httpx

from app.core.config import settings
from app.models.enums import EstadoEncomenda

logger = logging.getLogger(__name__)

# Mapeamento dos estados da 17TRACK para os estados internos do sistema.
# Referência: https://api.17track.net/en/doc (campo "package status")
MAPA_ESTADOS_17TRACK = {
    "InfoReceived": EstadoEncomenda.RECEBIDA_CHINA,
    "InTransit": EstadoEncomenda.EM_TRANSITO,
    "OutForDelivery": EstadoEncomenda.DISPONIVEL_LEVANTAMENTO,
    "Delivered": EstadoEncomenda.ENTREGUE,
    "Exception": EstadoEncomenda.ATRASADA,
    "Expired": EstadoEncomenda.ATRASADA,
}


def consultar_tracking_externo(tracking_externo: str, transportadora: str | None = None) -> dict | None:
    """Consulta a API externa e devolve {estado, descricao, localizacao} ou None."""
    if not settings.TRACKING_API_KEY:
        logger.warning("TRACKING_API_KEY não configurada; sincronização externa ignorada.")
        return None

    try:
        resposta = httpx.post(
            f"{settings.TRACKING_API_BASE_URL}/gettrackinfo",
            headers={"17token": settings.TRACKING_API_KEY},
            json=[{"number": tracking_externo}],
            timeout=30,
        )
        resposta.raise_for_status()
        dados = resposta.json()
    except httpx.HTTPError as erro:
        logger.error("Erro ao consultar a API de tracking para %s: %s", tracking_externo, erro)
        return None

    aceites = dados.get("data", {}).get("accepted", [])
    if not aceites:
        return None

    track_info = aceites[0].get("track_info", {})
    estado_externo = track_info.get("latest_status", {}).get("status")
    ultimo_evento = track_info.get("latest_event", {})

    estado_interno = MAPA_ESTADOS_17TRACK.get(estado_externo)
    if not estado_interno:
        return None

    return {
        "estado": estado_interno,
        "descricao": ultimo_evento.get("description"),
        "localizacao": ultimo_evento.get("location"),
    }
