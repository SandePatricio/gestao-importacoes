import re
from datetime import datetime, date
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, ConfigDict, Field, AfterValidator

from app.models.enums import (
    PerfilUtilizador,
    EstadoEncomenda,
    OrigemEvento,
    EstadoFactura,
    TipoPedido,
    EstadoPedido,
    TipoFactura,
    CategoriaAnexo,
)


# ---------- Validadores reutilizáveis (QA dos formulários) ----------
# A validação aqui é a fronteira de segurança; o frontend só ajuda a UX.

_RE_TELEFONE = re.compile(r"^\+?\d{7,15}$")
_RE_TEM_LETRA = re.compile(r"[A-Za-zÀ-ÿ]")


def _validar_nome(v: str) -> str:
    v = (v or "").strip()
    if len(v) < 2:
        raise ValueError("O nome deve ter pelo menos 2 caracteres.")
    if not _RE_TEM_LETRA.search(v):
        raise ValueError("O nome deve conter letras (não pode ser só números).")
    return v


def _validar_telefone(v: str) -> str:
    limpo = re.sub(r"[\s-]", "", v or "")
    if not _RE_TELEFONE.match(limpo):
        raise ValueError("Telefone inválido: use 7 a 15 dígitos (ex.: +258841234567).")
    return limpo


def _validar_nuit_opcional(v: str | None) -> str | None:
    if v is None:
        return None
    limpo = re.sub(r"\s", "", v)
    if limpo == "":
        return None
    if not re.fullmatch(r"\d{9}", limpo):
        raise ValueError("NUIT inválido: deve ter exactamente 9 dígitos.")
    return limpo


def _validar_nuit_config(v: str) -> str:
    """Como o anterior, mas devolve "" (e não None) — a config guarda string."""
    limpo = re.sub(r"\s", "", v or "")
    if limpo == "":
        return ""
    if not re.fullmatch(r"\d{9}", limpo):
        raise ValueError("NUIT inválido: deve ter exactamente 9 dígitos.")
    return limpo


# Tipos anotados — aplicáveis a qualquer schema
Nome = Annotated[str, AfterValidator(_validar_nome)]
Telefone = Annotated[str, AfterValidator(_validar_telefone)]
NuitOpcional = Annotated[str | None, AfterValidator(_validar_nuit_opcional)]
NuitConfig = Annotated[str, AfterValidator(_validar_nuit_config)]


# ---------- Auth / Utilizadores ----------

class UtilizadorCreate(BaseModel):
    nome: Nome
    email: EmailStr
    senha: str = Field(min_length=6)
    perfil: PerfilUtilizador = PerfilUtilizador.OPERADOR


class UtilizadorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: EmailStr
    perfil: PerfilUtilizador
    activo: bool


class UtilizadorUpdate(BaseModel):
    nome: Nome
    email: EmailStr
    perfil: PerfilUtilizador
    activo: bool
    senha: str | None = Field(default=None, min_length=6)  # se preenchida, repõe a senha


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    utilizador: UtilizadorOut


# ---------- Clientes ----------

class ClienteBase(BaseModel):
    # Tipos simples — também herdados por ClienteOut (saída não revalida dados antigos)
    nome: str
    telefone: str
    email: EmailStr | None = None
    nuit: str | None = None
    endereco: str | None = None


class ClienteCreate(ClienteBase):
    # Validação reforçada apenas na ENTRADA (criar/actualizar cliente)
    nome: Nome
    telefone: Telefone
    nuit: NuitOpcional = None
    # Senha de acesso ao portal do cliente (opcional; activa o portal)
    senha: str | None = Field(default=None, min_length=6)


class ClienteOut(ClienteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    portal_activo: bool = False
    criado_em: datetime


# ---------- Encomendas ----------

class EncomendaBase(BaseModel):
    # Tipos simples — herdados por EncomendaOut (saída não revalida dados antigos)
    descricao: str
    peso_kg: float | None = None
    comprimento_cm: float | None = None
    largura_cm: float | None = None
    altura_cm: float | None = None
    valor_frete: float | None = None
    origem: str = "China"
    destino: str = "Maputo, Moçambique"
    awb: str | None = None
    tracking_externo: str | None = None
    transportadora: str | None = None
    previsao_chegada: date | None = None


class EncomendaCreate(EncomendaBase):
    # Validação reforçada na entrada
    descricao: str = Field(min_length=1)
    peso_kg: float | None = Field(default=None, gt=0)
    comprimento_cm: float | None = Field(default=None, gt=0)
    largura_cm: float | None = Field(default=None, gt=0)
    altura_cm: float | None = Field(default=None, gt=0)
    valor_frete: float | None = Field(default=None, ge=0)
    cliente_id: int


class EncomendaUpdate(BaseModel):
    descricao: str | None = Field(default=None, min_length=1)
    peso_kg: float | None = Field(default=None, gt=0)
    comprimento_cm: float | None = Field(default=None, gt=0)
    largura_cm: float | None = Field(default=None, gt=0)
    altura_cm: float | None = Field(default=None, gt=0)
    valor_frete: float | None = Field(default=None, ge=0)
    awb: str | None = None
    tracking_externo: str | None = None
    transportadora: str | None = None
    previsao_chegada: date | None = None


class MudancaEstado(BaseModel):
    estado: EstadoEncomenda
    descricao: str | None = None
    localizacao: str | None = None


class EventoTrackingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estado: EstadoEncomenda
    descricao: str | None
    localizacao: str | None
    origem_evento: OrigemEvento
    data_evento: datetime


class MultaOut(BaseModel):
    dias: int
    valor_dia: float
    valor_total: float
    data_inicio: date


class EncomendaOut(EncomendaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_rastreio: str
    estado: EstadoEncomenda
    pedido_id: int | None = None
    # Pesos derivados das dimensões (calculados no modelo)
    peso_volumetrico_kg: float | None = None
    peso_cobravel_kg: float | None = None
    data_registo: datetime
    actualizado_em: datetime
    cliente: ClienteOut


class EncomendaDetalheOut(EncomendaOut):
    eventos: list[EventoTrackingOut] = []
    facturas: list["FacturaOut"] = []
    multa: MultaOut | None = None


# ---------- Consulta pública de tracking ----------

class TrackingPublicoOut(BaseModel):
    codigo_rastreio: str
    descricao: str
    estado: EstadoEncomenda
    origem: str
    destino: str
    previsao_chegada: date | None
    eventos: list[EventoTrackingOut]


# ---------- Detalhe do Cliente ----------

class EstatisticasCliente(BaseModel):
    total_encomendas: int
    activas: int
    entregues: int
    atrasadas: int
    peso_total_kg: float
    total_facturado: float
    total_pago: float
    total_pendente: float


class FacturaResumoOut(BaseModel):
    id: int
    numero: str
    tipo: TipoFactura
    valor_total: float
    estado: EstadoFactura
    data_emissao: datetime
    encomenda_id: int | None = None
    pedido_id: int | None = None
    codigo_rastreio: str | None = None  # código da encomenda ou do pedido
    cliente_id: int
    cliente_nome: str


class ClienteDetalheOut(BaseModel):
    cliente: ClienteOut
    estatisticas: EstatisticasCliente
    encomendas: list["EncomendaOut"]
    facturas: list[FacturaResumoOut]


# ---------- Portal do Cliente ----------

class PortalLogin(BaseModel):
    telefone: str
    senha: str


class PortalRegisto(BaseModel):
    nome: Nome
    telefone: Telefone
    senha: str = Field(min_length=6)
    email: EmailStr | None = None


class AlterarSenhaPortal(BaseModel):
    senha_actual: str
    senha_nova: str


class PortalToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    cliente: ClienteOut


# ---------- Facturas ----------

class FacturaCreate(BaseModel):
    encomenda_id: int
    # Opcional: se não for indicado, usa o frete calculado da encomenda
    valor_total: float | None = Field(default=None, gt=0)


class FacturaProdutoCreate(BaseModel):
    # Opcional: por defeito usa produto + serviço de compra da cotação do pedido
    valor_total: float | None = Field(default=None, gt=0)


class FacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    tipo: TipoFactura
    encomenda_id: int | None = None
    pedido_id: int | None = None
    valor_total: float
    peso_cobravel_kg: float | None = None
    tarifa_aplicada: float | None = None
    estado: EstadoFactura
    data_emissao: datetime


class FacturaDetalheOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    tipo: TipoFactura
    valor_total: float
    peso_cobravel_kg: float | None = None
    tarifa_aplicada: float | None = None
    estado: EstadoFactura
    data_emissao: datetime
    encomenda: EncomendaOut | None = None       # nas facturas de transporte
    pedido: "PedidoOut | None" = None           # nas facturas de produto


# ---------- Anexos ----------

class AnexoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    categoria: CategoriaAnexo
    nome_original: str
    mime_type: str | None = None
    tamanho_bytes: int | None = None
    visivel_cliente: bool
    pedido_id: int | None = None
    encomenda_id: int | None = None
    factura_id: int | None = None
    criado_em: datetime


# ---------- Itens do pedido ----------

class ItemPedidoBase(BaseModel):
    descricao: str = Field(min_length=1)
    quantidade: int = Field(default=1, ge=1)
    variacao: str | None = None       # modelo / tamanho / cor
    link_produto: str | None = None
    observacoes: str | None = None


class ItemPedidoCreate(ItemPedidoBase):
    pass


class ItemPedidoOut(ItemPedidoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------- Pedidos (processo de importação) ----------

class PedidoCreate(BaseModel):
    cliente_id: int
    tipo: TipoPedido
    itens: list[ItemPedidoCreate] = []
    # Modo ENVIO_DIRECTO: rastreio do envio do cliente até ao armazém China
    tracking_externo: str | None = None
    transportadora: str | None = None
    previsao_chegada_china: date | None = None


class PedidoPortalCreate(BaseModel):
    """Pedido aberto pelo próprio cliente no portal (sem cliente_id — vem do token)."""
    tipo: TipoPedido
    itens: list[ItemPedidoCreate] = []
    tracking_externo: str | None = None
    transportadora: str | None = None
    previsao_chegada_china: date | None = None


class CotacaoUpdate(BaseModel):
    preco_produto_mzn: float | None = Field(default=None, ge=0)
    servico_compra_mzn: float | None = Field(default=None, ge=0)
    peso_estimado_kg: float | None = Field(default=None, ge=0)
    estimativa_transporte_mzn: float | None = Field(default=None, ge=0)
    cotacao_observacoes: str | None = None


class MudancaEstadoPedido(BaseModel):
    estado: EstadoPedido
    descricao: str | None = None


class ReceberMedirIn(BaseModel):
    """Passo 5: recebe a mercadoria no armazém China e cria a encomenda física."""
    descricao: str | None = None  # vazio → gerada a partir dos itens
    peso_kg: float | None = Field(default=None, gt=0)
    comprimento_cm: float | None = Field(default=None, gt=0)
    largura_cm: float | None = Field(default=None, gt=0)
    altura_cm: float | None = Field(default=None, gt=0)
    awb: str | None = None
    tracking_externo: str | None = None
    transportadora: str | None = None
    previsao_chegada: date | None = None


class PedidoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    tipo: TipoPedido
    estado: EstadoPedido
    origem: str
    activo: bool = True
    cliente: ClienteOut
    estimativa_transporte_mzn: float | None = None
    total_pagar_agora_mzn: float | None = None
    total_estimado_mzn: float | None = None
    criado_em: datetime
    actualizado_em: datetime


class PedidoDetalheOut(PedidoOut):
    preco_produto_mzn: float | None = None
    servico_compra_mzn: float | None = None
    peso_estimado_kg: float | None = None
    cotacao_observacoes: str | None = None
    cotacao_enviada_em: datetime | None = None
    aprovada_em: datetime | None = None
    tracking_externo: str | None = None
    transportadora: str | None = None
    previsao_chegada_china: date | None = None
    itens: list[ItemPedidoOut] = []
    encomenda: EncomendaOut | None = None
    facturas: list[FacturaOut] = []
    anexos: list[AnexoOut] = []


# ---------- Configuração do frete ----------

MetodoISPC = Literal["PROGRESSIVA", "FIXA", "QUOTA"]


class ConfiguracaoFreteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tarifa_por_kg: float
    divisor_volumetrico: int
    ispc_metodo: MetodoISPC
    ispc_percentagem: float
    ispc_quota_anual: float
    ispc_primeiro_ano: bool
    empresa_nome: str
    empresa_nuit: str
    empresa_endereco: str
    empresa_telefone: str
    daf: str
    declarante_nome: str
    declarante_cargo: str
    actualizado_em: datetime | None = None


class ConfiguracaoFreteUpdate(BaseModel):
    tarifa_por_kg: float = Field(gt=0, description="Preço por kg em MZN")
    divisor_volumetrico: int = Field(gt=0, description="Divisor do peso volumétrico (ex.: 6000)")
    ispc_metodo: MetodoISPC = Field(description="PROGRESSIVA, FIXA ou QUOTA")
    ispc_percentagem: float = Field(ge=0, le=100, description="Taxa ISPC fixa em % (ex.: 3)")
    ispc_quota_anual: float = Field(ge=0, description="Quota fixa anual em MZN (ex.: 75000)")
    ispc_primeiro_ano: bool = Field(default=False, description="1.º ano de actividade → taxa a metade")
    # Identificação fiscal do contribuinte (facturas + declaração Modelo 30)
    empresa_nome: str = Field(default="", max_length=160)
    empresa_nuit: NuitConfig = Field(default="", max_length=20)
    empresa_endereco: str = Field(default="", max_length=255)
    empresa_telefone: str = Field(default="", max_length=40)
    daf: str = Field(default="", max_length=120, description="Direcção da Área Fiscal")
    declarante_nome: str = Field(default="", max_length=120)
    declarante_cargo: str = Field(default="", max_length=120)


class LogConfiguracaoFreteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    utilizador_nome: str
    alteracoes: str
    criado_em: datetime


# Resolve referências futuras (FacturaOut, PedidoOut definidos depois do uso)
EncomendaDetalheOut.model_rebuild()
FacturaDetalheOut.model_rebuild()
