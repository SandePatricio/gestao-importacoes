"""Cria as tabelas e o utilizador administrador inicial.

Uso: python seed.py
"""
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.models import Utilizador
from app.models.enums import PerfilUtilizador

ADMIN_EMAIL = "admin@conneximportacoes.co.mz"
ADMIN_SENHA = "admin123"  # alterar após o primeiro login


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Utilizador).filter(Utilizador.email == ADMIN_EMAIL).first():
            print(f"Administrador já existe: {ADMIN_EMAIL}")
            return
        db.add(
            Utilizador(
                nome="Administrador",
                email=ADMIN_EMAIL,
                senha_hash=hash_password(ADMIN_SENHA),
                perfil=PerfilUtilizador.ADMIN,
            )
        )
        db.commit()
        print(f"Administrador criado: {ADMIN_EMAIL} / {ADMIN_SENHA}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
