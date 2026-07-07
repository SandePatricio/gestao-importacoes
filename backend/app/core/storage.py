"""Armazenamento de anexos em disco (backend/uploads/AAAA/MM/uuid.ext).

Guarda-se o ficheiro com nome aleatório (UUID) e só o caminho relativo na base
de dados; o nome original fica no registo do anexo. Evita colisões e impede
path traversal a partir do nome enviado pelo cliente.
"""
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"

# Tipos e tamanho aceites (PDF e imagens, até 10 MB)
TIPOS_PERMITIDOS = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 10 * 1024 * 1024
_EXTENSAO = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def garantir_pasta() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def guardar_upload(upload: UploadFile) -> tuple[str, int]:
    """Valida e grava o ficheiro. Devolve (caminho_relativo, tamanho_bytes).

    Lança ValueError em tipo não permitido ou tamanho excedido.
    """
    if upload.content_type not in TIPOS_PERMITIDOS:
        raise ValueError("Tipo de ficheiro não permitido (use PDF, JPG, PNG ou WEBP).")

    conteudo = await upload.read()
    if len(conteudo) > MAX_BYTES:
        raise ValueError("Ficheiro demasiado grande (máximo 10 MB).")

    sub = datetime.now().strftime("%Y/%m")
    pasta = UPLOAD_DIR / sub
    pasta.mkdir(parents=True, exist_ok=True)

    nome = f"{uuid.uuid4().hex}{_EXTENSAO.get(upload.content_type, '')}"
    (pasta / nome).write_bytes(conteudo)
    return f"{sub}/{nome}", len(conteudo)


def caminho_absoluto(caminho_relativo: str) -> Path:
    return UPLOAD_DIR / caminho_relativo
