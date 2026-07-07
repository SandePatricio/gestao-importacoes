"""Portal do Cliente: o cliente autentica-se com telefone + senha de acesso
(definida pelo operador no registo) e consulta todas as suas encomendas
e facturas, sem precisar de contactar a empresa.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_cliente_actual
from app.core.security import verify_password, hash_password, create_access_token
from app.core import storage
from app.models.models import Cliente, Encomenda, Factura, Pedido, Anexo
from app.models.enums import EstadoPedido, CategoriaAnexo
from app.schemas.schemas import (
    PortalLogin,
    PortalRegisto,
    PortalToken,
    AlterarSenhaPortal,
    ClienteOut,
    EncomendaDetalheOut,
    FacturaOut,
    FacturaDetalheOut,
    PedidoPortalCreate,
    PedidoOut,
    PedidoDetalheOut,
    AnexoOut,
)
from app.services import pedido_service
from app.services.config_service import obter_configuracao
from app.services.scraping_service import extrair_info_url

router = APIRouter(prefix="/api/portal", tags=["Portal do Cliente"])


@router.get("/scraping")
def scraping_link_portal(url: str, cliente: Cliente = Depends(get_cliente_actual)):
    """Extrai info de um link de produto (cliente autenticado no portal)."""
    try:
        return extrair_info_url(url)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.get("/empresa")
def identidade_empresa(db: Session = Depends(get_db)):
    """Identidade da empresa para cabeçalho de documentos (cotação) no portal."""
    cfg = obter_configuracao(db)
    return {
        "empresa_nome": cfg.empresa_nome,
        "empresa_nuit": cfg.empresa_nuit,
        "empresa_endereco": cfg.empresa_endereco,
        "empresa_telefone": cfg.empresa_telefone,
    }


@router.post("/registar", response_model=PortalToken, status_code=201)
def registar_cliente(dados: PortalRegisto, db: Session = Depends(get_db)):
    """Auto-registo do cliente no portal. Se já existir um cliente com o mesmo
    telefone sem portal activo (criado pelo operador), assume essa ficha e
    activa-lhe o acesso; se já tiver senha, indica que deve fazer login.
    """
    telefone = dados.telefone.strip()
    existente = db.query(Cliente).filter(Cliente.telefone == telefone).first()

    if existente and existente.senha_hash:
        raise HTTPException(status_code=409, detail="Já existe uma conta com este telefone. Inicie sessão.")

    if existente:
        # Ficha criada pelo operador, ainda sem acesso ao portal → activa-a
        existente.senha_hash = hash_password(dados.senha)
        if dados.email and not existente.email:
            existente.email = dados.email
        cliente = existente
    else:
        cliente = Cliente(
            nome=dados.nome.strip(),
            telefone=telefone,
            email=dados.email,
            senha_hash=hash_password(dados.senha),
        )
        db.add(cliente)

    db.commit()
    db.refresh(cliente)
    token = create_access_token(str(cliente.id), "CLIENTE", tipo="cliente")
    return PortalToken(access_token=token, cliente=ClienteOut.model_validate(cliente))


@router.post("/login", response_model=PortalToken)
def login_cliente(dados: PortalLogin, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.telefone == dados.telefone.strip()).first()
    if not cliente or not cliente.senha_hash or not verify_password(dados.senha, cliente.senha_hash):
        raise HTTPException(status_code=401, detail="Telefone ou senha incorrectos")

    token = create_access_token(str(cliente.id), "CLIENTE", tipo="cliente")
    return PortalToken(access_token=token, cliente=ClienteOut.model_validate(cliente))


@router.post("/alterar-senha")
def alterar_senha(
    dados: AlterarSenhaPortal,
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    if not verify_password(dados.senha_actual, cliente.senha_hash):
        raise HTTPException(status_code=401, detail="A senha actual está incorrecta")
    if len(dados.senha_nova) < 6:
        raise HTTPException(status_code=422, detail="A nova senha deve ter pelo menos 6 caracteres")

    cliente.senha_hash = hash_password(dados.senha_nova)
    db.commit()
    return {"detail": "Senha alterada com sucesso"}


@router.get("/encomendas", response_model=list[EncomendaDetalheOut])
def minhas_encomendas(
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    return (
        db.query(Encomenda)
        .filter(Encomenda.cliente_id == cliente.id)
        .order_by(Encomenda.data_registo.desc())
        .all()
    )


@router.get("/facturas", response_model=list[FacturaOut])
def minhas_facturas(
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    # Facturas de transporte (via encomenda) e de produto (via pedido) do cliente
    transporte = (
        db.query(Factura).join(Encomenda).filter(Encomenda.cliente_id == cliente.id).all()
    )
    produto = (
        db.query(Factura)
        .join(Pedido)
        .filter(Pedido.cliente_id == cliente.id, Pedido.activo.is_(True))
        .all()
    )
    todas = {f.id: f for f in (*transporte, *produto)}.values()
    return sorted(todas, key=lambda f: f.data_emissao, reverse=True)


@router.get("/facturas/{factura_id}", response_model=FacturaDetalheOut)
def minha_factura(
    factura_id: int,
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    """Factura completa do cliente, para o documento imprimível no portal."""
    factura = db.get(Factura, factura_id)
    dono = factura and (
        (factura.encomenda and factura.encomenda.cliente_id == cliente.id)
        or (factura.pedido and factura.pedido.cliente_id == cliente.id)
    )
    if not dono:
        raise HTTPException(status_code=404, detail="Factura não encontrada")
    return factura


# ---------- Pedidos (processo de importação) ----------

def _pedido_do_cliente(db: Session, pedido_id: int, cliente: Cliente) -> Pedido:
    pedido = db.get(Pedido, pedido_id)
    if not pedido or pedido.cliente_id != cliente.id or not pedido.activo:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido


@router.post("/pedidos", response_model=PedidoDetalheOut, status_code=201)
def criar_pedido_portal(
    dados: PedidoPortalCreate,
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    """O cliente abre o seu próprio pedido de importação."""
    return pedido_service.criar_pedido(
        db,
        cliente_id=cliente.id,
        tipo=dados.tipo,
        itens=dados.itens,
        origem="PORTAL",
        criado_por_id=None,
        tracking_externo=dados.tracking_externo,
        transportadora=dados.transportadora,
        previsao_chegada_china=dados.previsao_chegada_china,
    )


@router.get("/pedidos", response_model=list[PedidoOut])
def meus_pedidos(
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    return (
        db.query(Pedido)
        .filter(Pedido.cliente_id == cliente.id, Pedido.activo.is_(True))
        .order_by(Pedido.criado_em.desc())
        .all()
    )


@router.get("/pedidos/{pedido_id}", response_model=PedidoDetalheOut)
def detalhe_pedido_portal(
    pedido_id: int,
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    pedido = _pedido_do_cliente(db, pedido_id, cliente)
    detalhe = PedidoDetalheOut.model_validate(pedido)
    # O cliente só vê os anexos marcados como visíveis
    detalhe.anexos = [a for a in detalhe.anexos if a.visivel_cliente]
    return detalhe


@router.post("/pedidos/{pedido_id}/aprovar", response_model=PedidoDetalheOut)
def aprovar_pedido_portal(
    pedido_id: int,
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    pedido = _pedido_do_cliente(db, pedido_id, cliente)
    try:
        return pedido_service.mudar_estado_pedido(db, pedido, EstadoPedido.APROVADA)
    except pedido_service.TransicaoInvalida:
        raise HTTPException(status_code=409, detail="A cotação não está disponível para aprovação.")


# Categorias que o cliente pode carregar pelo portal (fotos e comprovativos)
_CATEGORIAS_CLIENTE = {CategoriaAnexo.FOTO_PRODUTO, CategoriaAnexo.COMPROVATIVO_PAGAMENTO}


@router.post("/anexos", response_model=AnexoOut, status_code=201)
async def carregar_anexo_cliente(
    ficheiro: UploadFile = File(...),
    pedido_id: int | None = Form(None),
    encomenda_id: int | None = Form(None),
    factura_id: int | None = Form(None),
    categoria: CategoriaAnexo = Form(CategoriaAnexo.COMPROVATIVO_PAGAMENTO),
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    """O cliente carrega fotos do produto ou o comprovativo de pagamento."""
    if categoria not in _CATEGORIAS_CLIENTE:
        raise HTTPException(status_code=400, detail="Categoria de anexo não permitida.")
    if pedido_id:
        _pedido_do_cliente(db, pedido_id, cliente)
    elif encomenda_id:
        encomenda = db.get(Encomenda, encomenda_id)
        if not encomenda or encomenda.cliente_id != cliente.id:
            raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    elif factura_id:
        factura = db.get(Factura, factura_id)
        dono = factura and (
            (factura.encomenda and factura.encomenda.cliente_id == cliente.id)
            or (factura.pedido and factura.pedido.cliente_id == cliente.id)
        )
        if not dono:
            raise HTTPException(status_code=404, detail="Factura não encontrada")
    else:
        raise HTTPException(status_code=400, detail="Indique o pedido, a encomenda ou a factura.")

    try:
        caminho, tamanho = await storage.guardar_upload(ficheiro)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))

    anexo = Anexo(
        pedido_id=pedido_id,
        encomenda_id=encomenda_id,
        factura_id=factura_id,
        categoria=categoria,
        nome_original=ficheiro.filename or "anexo",
        caminho=caminho,
        mime_type=ficheiro.content_type,
        tamanho_bytes=tamanho,
        cliente_id=cliente.id,
        visivel_cliente=True,
    )
    db.add(anexo)
    db.commit()
    db.refresh(anexo)
    return anexo


@router.get("/anexos/{anexo_id}/download")
def descarregar_anexo_portal(
    anexo_id: int,
    cliente: Cliente = Depends(get_cliente_actual),
    db: Session = Depends(get_db),
):
    """Descarrega um anexo visível de um pedido/encomenda do próprio cliente."""
    anexo = db.get(Anexo, anexo_id)
    if not anexo or not anexo.visivel_cliente:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    dono = False
    if anexo.pedido_id:
        p = db.get(Pedido, anexo.pedido_id)
        dono = p is not None and p.cliente_id == cliente.id
    elif anexo.encomenda_id:
        enc = db.get(Encomenda, anexo.encomenda_id)
        dono = enc is not None and enc.cliente_id == cliente.id
    if not dono:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    caminho = storage.caminho_absoluto(anexo.caminho)
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Ficheiro em falta no servidor")
    return FileResponse(caminho, media_type=anexo.mime_type, filename=anexo.nome_original)
