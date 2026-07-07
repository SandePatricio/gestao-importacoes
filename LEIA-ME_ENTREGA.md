# Entrega do Sistema — Gestão de Encomendas Aéreas (Connex Importações)

Documento de entrega. Para os detalhes técnicos completos do funcionamento
(fluxo de importação, cálculo de frete, ISPC, estados da encomenda) consulte o
**`README.md`** que acompanha este pacote.

---

## O que está incluído neste pacote

```
backend/    API em Python (FastAPI) — lógica de negócio, base de dados, tracking
frontend/   Aplicação web (React) — páginas de gestão, portal do cliente e rastreio
docs/       Requisitos, diagramas UML e scripts SQL de migração
README.md   Manual técnico completo do sistema
```

> Para manter o pacote leve, **não** foram incluídas as pastas de dependências
> (`node_modules`, `.venv`) nem ficheiros gerados (`dist`, `__pycache__`). São
> recriadas nos passos de instalação abaixo.

---

## Requisitos para pôr a funcionar

| Componente | Versão recomendada | Para quê |
|------------|--------------------|----------|
| Python     | 3.11 ou superior   | Correr o backend (API) |
| Node.js    | 18 ou superior     | Correr o frontend (web) |
| MySQL / MariaDB | 8+ (ou XAMPP)  | Base de dados |

---

## Instalação (primeira vez)

### 1. Base de dados
Iniciar o MySQL. Há duas opções:

**Opção A — restaurar o dump com os dados já existentes** (recomendado para ver o
sistema com dados reais). O ficheiro está em `docs/dump_gestao_importacoes_*.sql` e
já cria a base de dados:
```sh
mysql -u root < docs/dump_gestao_importacoes_20260704.sql
```

**Opção B — começar com base vazia** (o `seed.py` no passo seguinte cria as tabelas):
```sh
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gestao_importacoes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Backend (API)
```sh
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # depois preencher as chaves (ver secção Configuração)
.venv/bin/python seed.py    # (só na Opção B) cria tabelas + administrador inicial
.venv/bin/uvicorn app.main:app --reload
```
API disponível em http://localhost:8000 · Documentação: http://localhost:8000/docs

**Login inicial:** `admin@conneximportacoes.co.mz` / `admin123`
(alterar a senha após o primeiro acesso).

### 3. Frontend (web)
Num segundo terminal:
```sh
cd frontend
npm install
npm run dev
```
Abrir http://localhost:5173

Páginas:
- `/login` — área de gestão (administrador/operador)
- `/portal` — portal do cliente (telefone + senha)
- `/rastrear` — consulta pública por código de rastreio

---

## Configuração (ficheiro `backend/.env`)

Chaves que dão acesso a serviços externos (**opcionais** — o sistema funciona sem
elas, apenas ficam inactivas a sincronização automática e o envio de e-mails):

- `TRACKING_API_KEY` — chave da **17TRACK** (conta em https://www.17track.net/en/apilist)
  para a sincronização automática do estado das encomendas;
- `SMTP_*` — servidor de e-mail para as notificações automáticas aos clientes.

Parâmetros de negócio (frete, ISPC) têm valores por defeito no `.env` mas são
**editáveis directamente no sistema**, na página **Configuração** (só administradores).

> **Nota de segurança:** este pacote inclui o ficheiro `.env` com as chaves usadas
> no desenvolvimento. Recomenda-se substituí-las por chaves próprias e **não
> partilhar** o `.env` publicamente.

---

## Contactos e suporte

Sistema desenvolvido como projecto de monografia de licenciatura em Engenharia
Informática (ISCTEM). Para dúvidas técnicas, o `README.md` documenta em detalhe
cada módulo, e a documentação interactiva da API (Swagger) fica em `/docs` com a
aplicação a correr.
