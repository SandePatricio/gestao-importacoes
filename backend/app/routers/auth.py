from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual, apenas_admin
from app.core.security import verify_password, hash_password, create_access_token
from app.models.models import Utilizador
from app.schemas.schemas import Token, UtilizadorCreate, UtilizadorUpdate, UtilizadorOut

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    utilizador = db.query(Utilizador).filter(Utilizador.email == form.username).first()
    if not utilizador or not verify_password(form.password, utilizador.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorrectos")
    if not utilizador.activo:
        raise HTTPException(status_code=403, detail="Conta desactivada")

    token = create_access_token(str(utilizador.id), utilizador.perfil.value)
    return Token(access_token=token, utilizador=UtilizadorOut.model_validate(utilizador))


@router.post("/utilizadores", response_model=UtilizadorOut, dependencies=[Depends(apenas_admin)])
def criar_utilizador(dados: UtilizadorCreate, db: Session = Depends(get_db)):
    if db.query(Utilizador).filter(Utilizador.email == dados.email).first():
        raise HTTPException(status_code=409, detail="Já existe um utilizador com este email")

    utilizador = Utilizador(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_password(dados.senha),
        perfil=dados.perfil,
    )
    db.add(utilizador)
    db.commit()
    db.refresh(utilizador)
    return utilizador


@router.get("/utilizadores", response_model=list[UtilizadorOut], dependencies=[Depends(apenas_admin)])
def listar_utilizadores(db: Session = Depends(get_db)):
    return db.query(Utilizador).order_by(Utilizador.nome).all()


@router.put("/utilizadores/{utilizador_id}", response_model=UtilizadorOut)
def actualizar_utilizador(
    utilizador_id: int,
    dados: UtilizadorUpdate,
    admin: Utilizador = Depends(apenas_admin),
    db: Session = Depends(get_db),
):
    utilizador = db.get(Utilizador, utilizador_id)
    if not utilizador:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")

    if utilizador.id == admin.id and not dados.activo:
        raise HTTPException(status_code=409, detail="Não pode desactivar a sua própria conta")

    duplicado = (
        db.query(Utilizador)
        .filter(Utilizador.email == dados.email, Utilizador.id != utilizador_id)
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=409, detail="Já existe um utilizador com este email")

    utilizador.nome = dados.nome
    utilizador.email = dados.email
    utilizador.perfil = dados.perfil
    utilizador.activo = dados.activo
    if dados.senha:
        utilizador.senha_hash = hash_password(dados.senha)

    db.commit()
    db.refresh(utilizador)
    return utilizador


@router.get("/me", response_model=UtilizadorOut)
def perfil_actual(utilizador: Utilizador = Depends(get_utilizador_actual)):
    return utilizador
