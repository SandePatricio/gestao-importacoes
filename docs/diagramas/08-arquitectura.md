# Diagrama de Arquitectura e Implantação

## Arquitectura de componentes

```mermaid
flowchart LR
    subgraph Navegador do utilizador
        SPA[SPA React + Tailwind<br/>Vite]
    end

    subgraph Servidor aplicacional
        API[FastAPI<br/>REST + OpenAPI]
        JOB[Job APScheduler<br/>sincronização 30 min]
        NOTIF[Serviço de Notificações]
    end

    subgraph Servidor de dados
        BD[(MySQL<br/>gestao_importacoes)]
    end

    subgraph Serviços externos
        T17[API 17TRACK<br/>tracking de encomendas]
        SMTP[Servidor SMTP<br/>e-mail]
    end

    SPA -- HTTPS/JSON --> API
    API -- SQLAlchemy --> BD
    JOB -- consulta --> T17
    JOB -- actualiza --> BD
    JOB --> NOTIF
    NOTIF -- envia --> SMTP
```

## Implantação (ambiente de desenvolvimento)

```mermaid
flowchart TB
    subgraph Mac["macOS (XAMPP)"]
        subgraph node["Node.js :5173"]
            vite[Vite dev server<br/>proxy /api → :8000]
        end
        subgraph py["Python 3.14 (.venv) :8000"]
            uvicorn[Uvicorn + FastAPI]
        end
        subgraph xampp["XAMPP :3306"]
            mysql[(MySQL)]
        end
    end
    internet((Internet)) --- t17[17TRACK / SMTP]

    vite --> uvicorn
    uvicorn --> mysql
    uvicorn -.job.-> t17
```

**Camadas do backend:** `routers` (apresentação/REST) → `services` (regras de negócio) → `models` (persistência ORM) → MySQL. Esta separação corresponde ao padrão de arquitectura em camadas descrito na fase de concepção.
