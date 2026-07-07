import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import Utilizador, Cliente
from app.models.enums import PerfilUtilizador

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

CREDENCIAIS_INVALIDAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciais inválidas ou sessão expirada",
    headers={"WWW-Authenticate": "Bearer"},
)


def _payload_do_token(token: str) -> dict:
    try:
        return decode_access_token(token)
    except jwt.PyJWTError:
        raise CREDENCIAIS_INVALIDAS


def get_utilizador_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Utilizador:
    payload = _payload_do_token(token)
    if payload.get("tipo") != "utilizador":
        raise CREDENCIAIS_INVALIDAS

    utilizador = db.query(Utilizador).filter(Utilizador.id == int(payload["sub"])).first()
    if utilizador is None or not utilizador.activo:
        raise CREDENCIAIS_INVALIDAS
    return utilizador


def get_cliente_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Cliente:
    payload = _payload_do_token(token)
    if payload.get("tipo") != "cliente":
        raise CREDENCIAIS_INVALIDAS

    cliente = db.get(Cliente, int(payload["sub"]))
    if cliente is None:
        raise CREDENCIAIS_INVALIDAS
    return cliente


def apenas_admin(utilizador: Utilizador = Depends(get_utilizador_actual)) -> Utilizador:
    if utilizador.perfil != PerfilUtilizador.ADMIN:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return utilizador
