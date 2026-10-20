"""Apoio às facturas: geração do número sequencial por ano."""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import Factura


def gerar_numero_factura(db: Session) -> str:
    """Número no formato FT<ano>/<sequencial>, contínuo entre produto e transporte.

    Parte do maior sequencial já usado no ano (e não da contagem), para nunca
    repetir um número existente — o campo é único e uma colisão impede a emissão.
    """
    ano = datetime.now().year
    prefixo = f"FT{ano}/"
    numeros = db.query(Factura.numero).filter(Factura.numero.like(f"{prefixo}%")).all()
    sequenciais = [int(n[len(prefixo):]) for (n,) in numeros if n[len(prefixo):].isdigit()]
    return f"{prefixo}{max(sequenciais, default=0) + 1:05d}"
