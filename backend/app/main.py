from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine, SessionLocal
from app.core import storage
from app.jobs.sync_tracking import iniciar_scheduler
from app.routers import (
    auth, clientes, encomendas, tracking_publico, facturas, dashboard,
    portal, configuracao, fiscal, pedidos, anexos, ferramentas,
)
from app.services.config_service import obter_configuracao


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    storage.garantir_pasta()
    # Garante a linha de configuração do frete e espelha-a em settings
    db = SessionLocal()
    try:
        obter_configuracao(db)
    finally:
        db.close()
    scheduler = iniciar_scheduler()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Sistema de Gestão de Encomendas Aéreas — Connex Importações",
    description="API para gestão, monitoria e rastreio de encomendas aéreas (China → Moçambique).",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(pedidos.router)
app.include_router(encomendas.router)
app.include_router(tracking_publico.router)
app.include_router(portal.router)
app.include_router(facturas.router)
app.include_router(anexos.router)
app.include_router(ferramentas.router)
app.include_router(dashboard.router)
app.include_router(configuracao.router)
app.include_router(fiscal.router)


@app.get("/api/health", tags=["Sistema"])
def health():
    return {"status": "ok"}
