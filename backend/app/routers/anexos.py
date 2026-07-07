"""Anexos: upload, listagem, descarga e remoção de documentos associados a
pedidos, encomendas ou facturas (gestão). O cliente carrega comprovativos pelo
portal — ver routers/portal.py.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.core import storage
from app.models.models import Anexo, Pedido, Encomenda, Factura, Utilizador
from app.models.enums import CategoriaAnexo
from app.schemas.schemas import AnexoOut

router = APIRouter(
    prefix="/api/anexos",
    tags=["Anexos"],
    dependencies=[Depends(get_utilizador_actual)],
)


def _validar_alvo(db: Session, pedido_id, encomenda_id, factura_id) -> None:
    if pedido_id is None and encomenda_id is None and factura_id is None:
        raise HTTPException(status_code=400, detail="Indique o pedido, a encomenda ou a factura.")
    if pedido_id and not db.get(Pedido, pedido_id):
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if encomenda_id and not db.get(Encomenda, encomenda_id):
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    if factura_id and not db.get(Factura, factura_id):
        raise HTTPException(status_code=404, detail="Factura não encontrada")


@router.post("", response_model=AnexoOut, status_code=201)
async def carregar_anexo(
    ficheiro: UploadFile = File(...),
    categoria: CategoriaAnexo = Form(CategoriaAnexo.OUTRO),
    pedido_id: int | None = Form(None),
    encomenda_id: int | None = Form(None),
    factura_id: int | None = Form(None),
    visivel_cliente: bool = Form(True),
    utilizador: Utilizador = Depends(get_utilizador_actual),
    db: Session = Depends(get_db),
):
    _validar_alvo(db, pedido_id, encomenda_id, factura_id)
    try:
        caminho, tamanho = await storage.guardar_upload(ficheiro)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))

    anexo = Anexo(
        pedido_id=pedido_id,
        encomenda_id=encomenda_id,
        factura_id=factura_id,
        categoria=categoria,
        nome_original=ficheiro.filename or "ficheiro",
        caminho=caminho,
        mime_type=ficheiro.content_type,
        tamanho_bytes=tamanho,
        utilizador_id=utilizador.id,
        visivel_cliente=visivel_cliente,
    )
    db.add(anexo)
    db.commit()
    db.refresh(anexo)
    return anexo


@router.get("", response_model=list[AnexoOut])
def listar_anexos(
    pedido_id: int | None = None,
    encomenda_id: int | None = None,
    factura_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Anexo)
    if pedido_id:
        query = query.filter(Anexo.pedido_id == pedido_id)
    if encomenda_id:
        query = query.filter(Anexo.encomenda_id == encomenda_id)
    if factura_id:
        query = query.filter(Anexo.factura_id == factura_id)
    return query.order_by(Anexo.criado_em.desc()).all()


@router.get("/{anexo_id}/download")
def descarregar_anexo(anexo_id: int, db: Session = Depends(get_db)):
    anexo = db.get(Anexo, anexo_id)
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    caminho = storage.caminho_absoluto(anexo.caminho)
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Ficheiro em falta no servidor")
    return FileResponse(caminho, media_type=anexo.mime_type, filename=anexo.nome_original)


@router.delete("/{anexo_id}", status_code=204)
def remover_anexo(anexo_id: int, db: Session = Depends(get_db)):
    anexo = db.get(Anexo, anexo_id)
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    caminho = storage.caminho_absoluto(anexo.caminho)
    if caminho.exists():
        caminho.unlink()
    db.delete(anexo)
    db.commit()
