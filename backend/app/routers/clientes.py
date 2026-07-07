from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.core.security import hash_password
from app.models.models import Cliente, Encomenda, Factura
from app.models.enums import EstadoEncomenda, EstadoFactura
from app.schemas.schemas import (
    ClienteCreate,
    ClienteOut,
    ClienteDetalheOut,
    EstatisticasCliente,
    FacturaResumoOut,
    EncomendaOut,
)

router = APIRouter(
    prefix="/api/clientes",
    tags=["Clientes"],
    dependencies=[Depends(get_utilizador_actual)],
)


@router.get("", response_model=list[ClienteOut])
def listar_clientes(pesquisa: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Cliente)
    if pesquisa:
        termo = f"%{pesquisa}%"
        query = query.filter(or_(Cliente.nome.like(termo), Cliente.telefone.like(termo)))
    return query.order_by(Cliente.nome).all()


@router.post("", response_model=ClienteOut, status_code=201)
def criar_cliente(dados: ClienteCreate, db: Session = Depends(get_db)):
    campos = dados.model_dump()
    senha = campos.pop("senha", None)
    cliente = Cliente(**campos, senha_hash=hash_password(senha) if senha else None)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/{cliente_id}", response_model=ClienteOut)
def obter_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente


@router.get("/{cliente_id}/detalhe", response_model=ClienteDetalheOut)
def detalhe_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    encomendas = (
        db.query(Encomenda)
        .filter(Encomenda.cliente_id == cliente_id)
        .order_by(Encomenda.data_registo.desc())
        .all()
    )
    facturas = (
        db.query(Factura)
        .join(Encomenda)
        .filter(Encomenda.cliente_id == cliente_id)
        .order_by(Factura.data_emissao.desc())
        .all()
    )

    entregues = sum(1 for e in encomendas if e.estado == EstadoEncomenda.ENTREGUE)
    atrasadas = sum(1 for e in encomendas if e.estado == EstadoEncomenda.ATRASADA)
    estatisticas = EstatisticasCliente(
        total_encomendas=len(encomendas),
        activas=len(encomendas) - entregues - atrasadas,
        entregues=entregues,
        atrasadas=atrasadas,
        peso_total_kg=float(sum(e.peso_kg or 0 for e in encomendas)),
        total_facturado=float(sum(f.valor_total for f in facturas if f.estado != EstadoFactura.CANCELADA)),
        total_pago=float(sum(f.valor_total for f in facturas if f.estado == EstadoFactura.PAGA)),
        total_pendente=float(sum(f.valor_total for f in facturas if f.estado == EstadoFactura.PENDENTE)),
    )

    return ClienteDetalheOut(
        cliente=ClienteOut.model_validate(cliente),
        estatisticas=estatisticas,
        encomendas=[EncomendaOut.model_validate(e) for e in encomendas],
        facturas=[
            FacturaResumoOut(
                id=f.id,
                numero=f.numero,
                valor_total=float(f.valor_total),
                estado=f.estado,
                data_emissao=f.data_emissao,
                encomenda_id=f.encomenda_id,
                codigo_rastreio=f.encomenda.codigo_rastreio,
                cliente_id=cliente.id,
                cliente_nome=cliente.nome,
            )
            for f in facturas
        ],
    )


@router.put("/{cliente_id}", response_model=ClienteOut)
def actualizar_cliente(cliente_id: int, dados: ClienteCreate, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    campos = dados.model_dump()
    senha = campos.pop("senha", None)
    for campo, valor in campos.items():
        setattr(cliente, campo, valor)
    if senha:
        cliente.senha_hash = hash_password(senha)
    db.commit()
    db.refresh(cliente)
    return cliente
