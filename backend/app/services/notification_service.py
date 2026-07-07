"""Envio de notificações pendentes aos clientes (e-mail via SMTP).

O canal WhatsApp pode ser acrescentado aqui mais tarde (WhatsApp Cloud API)
sem alterar o resto do sistema — as notificações ficam registadas na BD
com o canal pretendido e este serviço trata do envio.
"""
import logging
import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Notificacao
from app.models.enums import EstadoNotificacao, CanalNotificacao

logger = logging.getLogger(__name__)


def _enviar_email(destinatario: str, mensagem: str) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("SMTP não configurado; notificação não enviada.")
        return False
    try:
        email = MIMEText(mensagem, "plain", "utf-8")
        email["Subject"] = "Connex Importações — Actualização da sua encomenda"
        email["From"] = settings.SMTP_FROM
        email["To"] = destinatario

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as servidor:
            servidor.starttls()
            if settings.SMTP_USER:
                servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.send_message(email)
        return True
    except Exception as erro:
        logger.error("Falha no envio de e-mail para %s: %s", destinatario, erro)
        return False


def processar_notificacoes_pendentes(db: Session) -> int:
    """Envia as notificações pendentes; devolve o número de envios bem-sucedidos."""
    pendentes = (
        db.query(Notificacao)
        .filter(Notificacao.estado == EstadoNotificacao.PENDENTE)
        .all()
    )
    enviadas = 0
    for notificacao in pendentes:
        # A notificação pode estar ligada a uma encomenda (fase física) ou a um
        # pedido (fase de cotação/compra). O cliente vem de qualquer uma delas.
        origem = notificacao.encomenda or notificacao.pedido
        cliente = origem.cliente if origem else None
        if cliente is None:
            notificacao.estado = EstadoNotificacao.FALHADA
            continue

        if notificacao.canal == CanalNotificacao.EMAIL and cliente.email:
            sucesso = _enviar_email(cliente.email, notificacao.mensagem)
        else:
            sucesso = False

        if sucesso:
            notificacao.estado = EstadoNotificacao.ENVIADA
            notificacao.enviada_em = datetime.now(timezone.utc)
            enviadas += 1
        else:
            notificacao.estado = EstadoNotificacao.FALHADA
    db.commit()
    return enviadas
