from datetime import datetime, date

from sqlalchemy import String, Text, ForeignKey, Numeric, Integer, DateTime, Date, Enum, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.config import settings
from app.models.enums import (
    PerfilUtilizador,
    EstadoEncomenda,
    OrigemEvento,
    EstadoFactura,
    CanalNotificacao,
    EstadoNotificacao,
    TipoPedido,
    EstadoPedido,
    TipoFactura,
    CategoriaAnexo,
)


class Utilizador(Base):
    __tablename__ = "utilizadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    perfil: Mapped[PerfilUtilizador] = mapped_column(Enum(PerfilUtilizador), default=PerfilUtilizador.OPERADOR)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    telefone: Mapped[str] = mapped_column(String(20), index=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    nuit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Senha de acesso ao portal do cliente; null = portal não activado
    senha_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    encomendas: Mapped[list["Encomenda"]] = relationship(back_populates="cliente")

    @property
    def portal_activo(self) -> bool:
        return self.senha_hash is not None


class Pedido(Base):
    """Processo de importação. Nasce antes da carga física existir (cotação,
    compra) e dá origem a uma Encomenda quando a mercadoria é recebida e medida
    no armazém da China (passo 5).
    """
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # PED-XXXXXX
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), index=True)
    tipo: Mapped[TipoPedido] = mapped_column(Enum(TipoPedido))
    estado: Mapped[EstadoPedido] = mapped_column(Enum(EstadoPedido), index=True)
    origem: Mapped[str] = mapped_column(String(20), default="OPERADOR")  # OPERADOR | PORTAL
    criado_por_id: Mapped[int | None] = mapped_column(ForeignKey("utilizadores.id"), nullable=True)
    # Soft-delete: pedido inactivado deixa de aparecer nas listagens, mas o
    # histórico (facturas, encomenda, notificações) é preservado.
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", index=True)

    # Cotação (valores em MZN, introduzidos pelo operador após o procurement).
    # O preço do produto já vem convertido para MZN; sem câmbio nem regra de comissão.
    preco_produto_mzn: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    servico_compra_mzn: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    peso_estimado_kg: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    estimativa_transporte_mzn: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    cotacao_observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cotacao_enviada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    aprovada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Modo ENVIO_DIRECTO: rastreio do envio do próprio cliente até ao armazém China
    tracking_externo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    transportadora: Mapped[str | None] = mapped_column(String(80), nullable=True)
    previsao_chegada_china: Mapped[date | None] = mapped_column(Date, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    actualizado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    cliente: Mapped["Cliente"] = relationship()
    itens: Mapped[list["ItemPedido"]] = relationship(back_populates="pedido", cascade="all, delete-orphan")
    encomenda: Mapped["Encomenda"] = relationship(back_populates="pedido", uselist=False)
    facturas: Mapped[list["Factura"]] = relationship(back_populates="pedido")
    anexos: Mapped[list["Anexo"]] = relationship(back_populates="pedido", cascade="all, delete-orphan")
    notificacoes: Mapped[list["Notificacao"]] = relationship(back_populates="pedido")

    @property
    def total_pagar_agora_mzn(self) -> float | None:
        """Produto + serviço de compra — o que o cliente paga no passo 3 (firme)."""
        if self.preco_produto_mzn is None and self.servico_compra_mzn is None:
            return None
        return round(float(self.preco_produto_mzn or 0) + float(self.servico_compra_mzn or 0), 2)

    @property
    def total_estimado_mzn(self) -> float | None:
        """Total indicativo da cotação (produto + serviço + estimativa de transporte)."""
        partes = [
            p for p in (
                self.total_pagar_agora_mzn,
                float(self.estimativa_transporte_mzn) if self.estimativa_transporte_mzn else None,
            ) if p is not None
        ]
        return round(sum(partes), 2) if partes else None


class ItemPedido(Base):
    __tablename__ = "itens_pedido"

    id: Mapped[int] = mapped_column(primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"), index=True)
    descricao: Mapped[str] = mapped_column(Text)
    quantidade: Mapped[int] = mapped_column(Integer, default=1)
    variacao: Mapped[str | None] = mapped_column(String(255), nullable=True)  # modelo/tamanho/cor
    link_produto: Mapped[str | None] = mapped_column(String(500), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    pedido: Mapped["Pedido"] = relationship(back_populates="itens")


class Encomenda(Base):
    __tablename__ = "encomendas"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_rastreio: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    awb: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    tracking_externo: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    transportadora: Mapped[str | None] = mapped_column(String(80), nullable=True)
    descricao: Mapped[str] = mapped_column(Text)
    peso_kg: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    # Dimensões da carga em centímetros, usadas no peso volumétrico
    comprimento_cm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    largura_cm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    altura_cm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    valor_frete: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    origem: Mapped[str] = mapped_column(String(80), default="China")
    destino: Mapped[str] = mapped_column(String(80), default="Maputo, Moçambique")
    estado: Mapped[EstadoEncomenda] = mapped_column(Enum(EstadoEncomenda), default=EstadoEncomenda.REGISTADA, index=True)
    previsao_chegada: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Momento em que ficou disponível para levantamento em Maputo (base da multa)
    data_disponivel: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    data_registo: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    actualizado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    # Processo de origem (null nas encomendas antigas, criadas antes dos pedidos)
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"), nullable=True, index=True)
    cliente: Mapped["Cliente"] = relationship(back_populates="encomendas")
    pedido: Mapped["Pedido"] = relationship(back_populates="encomenda")
    eventos: Mapped[list["EventoTracking"]] = relationship(back_populates="encomenda", order_by="EventoTracking.data_evento")
    facturas: Mapped[list["Factura"]] = relationship(back_populates="encomenda")
    notificacoes: Mapped[list["Notificacao"]] = relationship(back_populates="encomenda")

    @property
    def peso_volumetrico_kg(self) -> float | None:
        """Peso volumétrico = (C × L × A) / divisor, com as dimensões em cm."""
        if self.comprimento_cm and self.largura_cm and self.altura_cm:
            volume = float(self.comprimento_cm) * float(self.largura_cm) * float(self.altura_cm)
            return round(volume / settings.DIVISOR_VOLUMETRICO, 2)
        return None

    @property
    def peso_cobravel_kg(self) -> float | None:
        """Peso a cobrar: o maior entre o peso real e o peso volumétrico."""
        pesos = [
            p for p in (
                float(self.peso_kg) if self.peso_kg else None,
                self.peso_volumetrico_kg,
            ) if p
        ]
        return max(pesos) if pesos else None

    @property
    def multa(self) -> dict | None:
        """Multa em aberto por atraso no pagamento do frete.

        Conta-se MULTA_VALOR_DIA por cada dia para além da tolerância, a partir
        da disponibilidade em Maputo. Deixa de se aplicar quando a factura de
        transporte é paga (calculada em tempo real — não é guardada).
        """
        from datetime import datetime, timedelta
        from app.models.enums import EstadoFactura, TipoFactura

        if not self.data_disponivel:
            return None
        transporte_pago = any(
            f.tipo == TipoFactura.TRANSPORTE and f.estado == EstadoFactura.PAGA
            for f in self.facturas
        )
        if transporte_pago:
            return None

        tolerancia = settings.MULTA_DIAS_TOLERANCIA
        inicio = self.data_disponivel + timedelta(days=tolerancia)
        dias = (datetime.now().date() - inicio.date()).days
        if dias <= 0:
            return None
        valor_dia = float(settings.MULTA_VALOR_DIA)
        return {
            "dias": dias,
            "valor_dia": valor_dia,
            "valor_total": round(dias * valor_dia, 2),
            "data_inicio": inicio.date(),
        }


class EventoTracking(Base):
    __tablename__ = "eventos_tracking"

    id: Mapped[int] = mapped_column(primary_key=True)
    encomenda_id: Mapped[int] = mapped_column(ForeignKey("encomendas.id"), index=True)
    estado: Mapped[EstadoEncomenda] = mapped_column(Enum(EstadoEncomenda))
    descricao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    localizacao: Mapped[str | None] = mapped_column(String(120), nullable=True)
    origem_evento: Mapped[OrigemEvento] = mapped_column(Enum(OrigemEvento), default=OrigemEvento.MANUAL)
    data_evento: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    encomenda: Mapped["Encomenda"] = relationship(back_populates="eventos")


class Factura(Base):
    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    tipo: Mapped[TipoFactura] = mapped_column(Enum(TipoFactura), default=TipoFactura.TRANSPORTE)
    # Uma factura de TRANSPORTE liga-se à encomenda; uma de PRODUTO liga-se ao pedido
    # (que ainda não tem encomenda no passo 3). Exactamente um dos dois é preenchido.
    encomenda_id: Mapped[int | None] = mapped_column(ForeignKey("encomendas.id"), nullable=True, index=True)
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"), nullable=True, index=True)
    valor_total: Mapped[float] = mapped_column(Numeric(12, 2))  # ISPC não cobra IVA
    # Base de cálculo congelada no momento da emissão (justifica o valor)
    peso_cobravel_kg: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    tarifa_aplicada: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    estado: Mapped[EstadoFactura] = mapped_column(Enum(EstadoFactura), default=EstadoFactura.PENDENTE)
    data_emissao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    encomenda: Mapped["Encomenda"] = relationship(back_populates="facturas")
    pedido: Mapped["Pedido"] = relationship(back_populates="facturas")


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Liga-se à encomenda (fase física) ou ao pedido (fase de cotação/compra)
    encomenda_id: Mapped[int | None] = mapped_column(ForeignKey("encomendas.id"), nullable=True, index=True)
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"), nullable=True, index=True)
    canal: Mapped[CanalNotificacao] = mapped_column(Enum(CanalNotificacao), default=CanalNotificacao.EMAIL)
    mensagem: Mapped[str] = mapped_column(Text)
    estado: Mapped[EstadoNotificacao] = mapped_column(Enum(EstadoNotificacao), default=EstadoNotificacao.PENDENTE)
    enviada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    criada_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    encomenda: Mapped["Encomenda"] = relationship(back_populates="notificacoes")
    pedido: Mapped["Pedido"] = relationship(back_populates="notificacoes")


class ConfiguracaoFrete(Base):
    """Parâmetros do cálculo do frete, editáveis (linha única, id=1)."""
    __tablename__ = "configuracao_frete"

    id: Mapped[int] = mapped_column(primary_key=True)
    tarifa_por_kg: Mapped[float] = mapped_column(Numeric(12, 2))
    divisor_volumetrico: Mapped[int] = mapped_column(Integer)
    # ISPC (Imposto Simplificado p/ Pequenos Contribuintes) — método e parâmetros
    ispc_metodo: Mapped[str] = mapped_column(String(20), default="PROGRESSIVA")  # PROGRESSIVA | FIXA | QUOTA
    ispc_percentagem: Mapped[float] = mapped_column(Numeric(5, 2), default=3)
    ispc_quota_anual: Mapped[float] = mapped_column(Numeric(12, 2), default=75000)
    ispc_primeiro_ano: Mapped[bool] = mapped_column(Boolean, default=False)
    # Identificação fiscal do contribuinte (para facturas e declaração Modelo 30)
    empresa_nome: Mapped[str] = mapped_column(String(160), default="Connex Importações, Lda.")
    empresa_nuit: Mapped[str] = mapped_column(String(20), default="")
    empresa_endereco: Mapped[str] = mapped_column(String(255), default="Maputo, Moçambique")
    empresa_telefone: Mapped[str] = mapped_column(String(40), default="")
    daf: Mapped[str] = mapped_column(String(120), default="")  # Direcção da Área Fiscal
    declarante_nome: Mapped[str] = mapped_column(String(120), default="")
    declarante_cargo: Mapped[str] = mapped_column(String(120), default="")
    # Dados de pagamento impressos nas facturas
    banco_nome: Mapped[str] = mapped_column(String(120), default="", server_default="")
    banco_titular: Mapped[str] = mapped_column(String(160), default="", server_default="")
    banco_conta: Mapped[str] = mapped_column(String(40), default="", server_default="")
    banco_nib: Mapped[str] = mapped_column(String(40), default="", server_default="")
    pagamento_movel: Mapped[str] = mapped_column(String(120), default="", server_default="")  # M-Pesa / e-Mola
    actualizado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Anexo(Base):
    """Documento/ficheiro associado a um pedido, encomenda ou factura.

    Dá transparência ao cliente (fotos reais, factura do fornecedor, despacho)
    e permite-lhe enviar o seu comprovativo de pagamento. `visivel_cliente`
    controla o que aparece no portal.
    """
    __tablename__ = "anexos"

    id: Mapped[int] = mapped_column(primary_key=True)
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"), nullable=True, index=True)
    encomenda_id: Mapped[int | None] = mapped_column(ForeignKey("encomendas.id"), nullable=True, index=True)
    factura_id: Mapped[int | None] = mapped_column(ForeignKey("facturas.id"), nullable=True, index=True)
    categoria: Mapped[CategoriaAnexo] = mapped_column(Enum(CategoriaAnexo), default=CategoriaAnexo.OUTRO)
    nome_original: Mapped[str] = mapped_column(String(255))
    caminho: Mapped[str] = mapped_column(String(500))  # relativo a uploads/ (ex.: 2026/06/uuid.pdf)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tamanho_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Quem carregou (um dos dois): operador ou cliente
    utilizador_id: Mapped[int | None] = mapped_column(ForeignKey("utilizadores.id"), nullable=True)
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id"), nullable=True)
    visivel_cliente: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    pedido: Mapped["Pedido"] = relationship(back_populates="anexos")


class LogConfiguracaoFrete(Base):
    """Auditoria: regista cada alteração à configuração (frete/ISPC) e por quem."""
    __tablename__ = "logs_configuracao_frete"

    id: Mapped[int] = mapped_column(primary_key=True)
    utilizador_id: Mapped[int | None] = mapped_column(ForeignKey("utilizadores.id"), nullable=True)
    utilizador_nome: Mapped[str] = mapped_column(String(120))  # snapshot (sobrevive à remoção do utilizador)
    alteracoes: Mapped[str] = mapped_column(Text)  # descrição "campo: antes → depois"
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
