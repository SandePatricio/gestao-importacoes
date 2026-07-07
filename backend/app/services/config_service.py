"""Parâmetros de frete e ISPC guardados na base de dados.

A configuração vive numa linha única (`configuracao_frete`, id=1) e é espelhada no
objecto `settings` em runtime, para que o cálculo do frete e do ISPC leiam de um só
sítio. Cada alteração fica registada em `logs_configuracao_frete` (quem, quando e a
descrição "campo: antes → depois").
"""
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import ConfiguracaoFrete, LogConfiguracaoFrete, Utilizador


def _sincronizar_settings(cfg: ConfiguracaoFrete) -> None:
    settings.TARIFA_POR_KG = float(cfg.tarifa_por_kg)
    settings.DIVISOR_VOLUMETRICO = int(cfg.divisor_volumetrico)
    settings.ISPC_METODO = cfg.ispc_metodo
    settings.ISPC_PERCENTAGEM = float(cfg.ispc_percentagem)
    settings.ISPC_QUOTA_ANUAL = float(cfg.ispc_quota_anual)
    settings.ISPC_PRIMEIRO_ANO = bool(cfg.ispc_primeiro_ano)


def obter_configuracao(db: Session) -> ConfiguracaoFrete:
    """Devolve a configuração; cria-a com os valores por defeito se ainda não existir."""
    cfg = db.get(ConfiguracaoFrete, 1)
    if cfg is None:
        cfg = ConfiguracaoFrete(
            id=1,
            tarifa_por_kg=settings.TARIFA_POR_KG,
            divisor_volumetrico=settings.DIVISOR_VOLUMETRICO,
            ispc_metodo=settings.ISPC_METODO,
            ispc_percentagem=settings.ISPC_PERCENTAGEM,
            ispc_quota_anual=settings.ISPC_QUOTA_ANUAL,
            ispc_primeiro_ano=settings.ISPC_PRIMEIRO_ANO,
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    _sincronizar_settings(cfg)
    return cfg


# Rótulos legíveis para a descrição da auditoria
_METODO_LABEL = {
    "PROGRESSIVA": "Progressiva (3/4/5%)",
    "FIXA": "Percentagem fixa",
    "QUOTA": "Quota fixa anual",
}


def _fmt_metodo(v):
    return _METODO_LABEL.get(v, v)


def _fmt_num(sufixo=""):
    return lambda v: f"{float(v):g}{sufixo}"


def _fmt_bool(v):
    return "Sim" if v else "Não"


# (atributo, rótulo, formatador) — usado para o diff legível da auditoria
_CAMPOS = [
    ("tarifa_por_kg", "Tarifa", _fmt_num(" MZN/kg")),
    ("divisor_volumetrico", "Divisor", lambda v: str(int(v))),
    ("ispc_metodo", "Método ISPC", _fmt_metodo),
    ("ispc_percentagem", "ISPC %", _fmt_num("%")),
    ("ispc_quota_anual", "Quota ISPC", _fmt_num(" MZN/ano")),
    ("ispc_primeiro_ano", "1.º ano ISPC", _fmt_bool),
    ("empresa_nome", "Designação", str),
    ("empresa_nuit", "NUIT", str),
    ("empresa_endereco", "Endereço", str),
    ("empresa_telefone", "Telefone", str),
    ("daf", "DAF", str),
    ("declarante_nome", "Declarante", str),
    ("declarante_cargo", "Cargo do declarante", str),
]


def actualizar_configuracao(db: Session, novos: dict, utilizador: Utilizador) -> ConfiguracaoFrete:
    """Actualiza os parâmetros, regista a alteração na auditoria e espelha em settings.

    `novos` é o dicionário validado (ConfiguracaoFreteUpdate.model_dump()).
    """
    cfg = obter_configuracao(db)

    # Descrição apenas dos campos que mudaram (comparação pelo valor formatado)
    mudancas: list[str] = []
    for attr, rotulo, fmt in _CAMPOS:
        if attr not in novos:
            continue
        antes, depois = fmt(getattr(cfg, attr)), fmt(novos[attr])
        if antes != depois:
            mudancas.append(f"{rotulo}: {antes or '—'} → {depois or '—'}")

    if mudancas:
        db.add(
            LogConfiguracaoFrete(
                utilizador_id=utilizador.id,
                utilizador_nome=utilizador.nome,
                alteracoes="; ".join(mudancas),
            )
        )

    for attr, _, _ in _CAMPOS:
        if attr in novos:
            setattr(cfg, attr, novos[attr])
    db.commit()
    db.refresh(cfg)
    _sincronizar_settings(cfg)
    return cfg
