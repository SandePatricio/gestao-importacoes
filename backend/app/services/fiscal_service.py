"""Apoio à declaração do ISPC (Modelo 30) na Autoridade Tributária.

O ISPC incide sobre o volume de negócios (facturação). O período é trimestral e o
pagamento é feito nos meses de Abril, Julho, Outubro e Janeiro do ano seguinte.
Aqui considera-se como volume de negócios a RECEITA das facturas PAGAS, agrupada por
trimestre civil da data de emissão. Nas facturas de TRANSPORTE conta o valor total
(frete = receita); nas de PRODUTO conta apenas o serviço de compra, porque o custo
do produto é reembolso por conta do cliente e não facturação da empresa.
"""
from datetime import date

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Factura
from app.models.enums import EstadoFactura, TipoFactura


def _receita_factura(f: Factura) -> float:
    """Parte da factura que conta como volume de negócios da empresa."""
    if f.tipo == TipoFactura.PRODUTO:
        return float(f.pedido.servico_compra_mzn or 0) if f.pedido else 0.0
    return float(f.valor_total)

# Escalões progressivos (alterações de 2025): (limite anual, taxa %)
_ESCALOES = [(1_000_000, 3.0), (2_500_000, 4.0)]
_TAXA_ACIMA = 5.0

_PERIODOS = ["Jan–Mar", "Abr–Jun", "Jul–Set", "Out–Dez"]
_MESES_PAGAMENTO = ["Abril", "Julho", "Outubro", "Janeiro"]


def _taxa_progressiva(volume_anual: float) -> float:
    for limite, taxa in _ESCALOES:
        if volume_anual <= limite:
            return taxa
    return _TAXA_ACIMA


def calcular_ispc(db: Session, ano: int) -> dict:
    """Calcula o volume de negócios por trimestre e o ISPC devido no ano indicado."""
    facturas = (
        db.query(Factura)
        .filter(
            Factura.estado == EstadoFactura.PAGA,
            Factura.data_emissao >= date(ano, 1, 1),
            Factura.data_emissao < date(ano + 1, 1, 1),
        )
        .all()
    )

    # Volume de negócios por trimestre (índice 0..3)
    volumes = [0.0, 0.0, 0.0, 0.0]
    for f in facturas:
        trimestre = (f.data_emissao.month - 1) // 3
        volumes[trimestre] += _receita_factura(f)
    volume_anual = round(sum(volumes), 2)

    metodo = settings.ISPC_METODO
    primeiro_ano = bool(settings.ISPC_PRIMEIRO_ANO)

    # Taxa a aplicar (None quando é quota fixa)
    taxa = None
    if metodo == "QUOTA":
        quota_trimestral = round(float(settings.ISPC_QUOTA_ANUAL) / 4, 2)
    else:
        taxa = _taxa_progressiva(volume_anual) if metodo == "PROGRESSIVA" else float(settings.ISPC_PERCENTAGEM)
        if primeiro_ano:
            taxa = round(taxa / 2, 2)

    trimestres = []
    for i in range(4):
        volume = round(volumes[i], 2)
        if metodo == "QUOTA":
            ispc = quota_trimestral
        else:
            ispc = round(volume * taxa / 100, 2)
        trimestres.append({
            "trimestre": i + 1,
            "periodo": _PERIODOS[i],
            "volume_negocios": volume,
            "taxa": taxa,
            "ispc_devido": ispc,
            "mes_pagamento": f"{_MESES_PAGAMENTO[i]} {ano + 1 if i == 3 else ano}",
        })

    return {
        "ano": ano,
        "metodo": metodo,
        "primeiro_ano": primeiro_ano,
        "taxa": taxa,
        "quota_anual": float(settings.ISPC_QUOTA_ANUAL) if metodo == "QUOTA" else None,
        "volume_anual": volume_anual,
        "total_ispc": round(sum(t["ispc_devido"] for t in trimestres), 2),
        "trimestres": trimestres,
    }


def anos_com_facturas(db: Session) -> list[int]:
    """Anos (distintos) com facturas pagas, para o selector do relatório."""
    datas = (
        db.query(Factura.data_emissao)
        .filter(Factura.estado == EstadoFactura.PAGA)
        .all()
    )
    return sorted({d[0].year for d in datas}, reverse=True)
