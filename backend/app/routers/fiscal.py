from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_utilizador_actual
from app.models.models import Utilizador
from app.services.fiscal_service import calcular_ispc, anos_com_facturas

router = APIRouter(
    prefix="/api/fiscal",
    tags=["Fiscal"],
    dependencies=[Depends(get_utilizador_actual)],
)


@router.get("/ispc/anos")
def listar_anos(db: Session = Depends(get_db)) -> list[int]:
    """Anos com facturas pagas (para o selector do relatório)."""
    return anos_com_facturas(db)


@router.get("/ispc")
def relatorio_ispc(ano: int, db: Session = Depends(get_db)):
    """Volume de negócios por trimestre e ISPC devido — apoio ao Modelo 30."""
    return calcular_ispc(db, ano)
