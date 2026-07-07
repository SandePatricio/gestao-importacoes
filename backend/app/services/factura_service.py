"""Apoio às facturas: geração do número sequencial por ano."""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import Factura


def gerar_numero_factura(db: Session) -> str:
    """Número no formato FT<ano>/<sequencial>, contínuo entre produto e transporte."""
    ano = datetime.now().year
    total_ano = db.query(Factura).filter(Factura.numero.like(f"FT{ano}/%")).count()
    return f"FT{ano}/{total_ano + 1:05d}"
