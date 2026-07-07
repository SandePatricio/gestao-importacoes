"""Ferramentas de apoio ao operador, incl. extração de info de um link de produto."""
from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_utilizador_actual
from app.services.scraping_service import extrair_info_url

router = APIRouter(
    prefix="/api/ferramentas",
    tags=["Ferramentas"],
    dependencies=[Depends(get_utilizador_actual)],
)


@router.get("/scraping")
def scraping_link(url: str):
    """Extrai título, descrição, imagem e preço de um link de produto."""
    try:
        return extrair_info_url(url)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
