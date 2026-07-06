# Sistema de Gestão de Encomendas Aéreas — Connex Importações

Monografia de licenciatura — ISCTEM, Engenharia Informática.

**Stack:** FastAPI + SQLAlchemy + MySQL (backend) · React + Tailwind (frontend) · API externa de tracking (17TRACK).

## Estrutura

```
backend/    API FastAPI (auth JWT, clientes, encomendas, facturas, tracking público, dashboard)
frontend/   SPA React + Tailwind (por criar)
docs/       Requisitos e diagramas UML da monografia
```

## Arranque do backend

1. **Iniciar o MySQL** no XAMPP (manager-osx ou `sudo /Applications/XAMPP/xamppfiles/bin/mysql.server start`).

2. **Criar a base de dados** (uma única vez):
   ```sh
   /Applications/XAMPP/xamppfiles/bin/mysql -u root -e "CREATE DATABASE IF NOT EXISTS gestao_importacoes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

3. **Criar tabelas e administrador inicial:**
   ```sh
   cd backend
   .venv/bin/python seed.py
   # Login inicial: admin@conneximportacoes.co.mz / admin123
   ```

4. **Arrancar a API:**
   ```sh
   .venv/bin/uvicorn app.main:app --reload
   ```
   Documentação interactiva (Swagger): http://localhost:8000/docs

## Arranque do frontend

Num segundo terminal (não acrescentar nada depois de `dev`):

```sh
cd frontend
npm run dev
```

Abrir http://localhost:5173 no browser. Páginas:
- `/login` — área de gestão (admin/operador)
- `/portal` — portal do cliente (telefone + senha)
- `/rastrear` — consulta pública por código de rastreio

## Configuração

Copiar `backend/.env.example` para `backend/.env` e preencher:
- `TRACKING_API_KEY` — *Access Key* da 17TRACK (criar conta em https://www.17track.net/en/apilist e copiar o token) para a sincronização automática;
- `SMTP_*` — servidor de e-mail para notificações automáticas aos clientes.

Sem estas chaves o sistema funciona normalmente; apenas a sincronização externa
e o envio de notificações ficam inactivos (registados como FALHADA/ignorados).

## Processo de importação (Pedido)

Antes de existir carga física, há um **processo de importação** (`Pedido`, código
`PED-XXXXXX`) que pode ser aberto pelo **operador** ou pelo **próprio cliente** no
portal. Tem dois modos:

- **COM_COMPRA** — a Connex compra o produto: solicitação → **cotação** (após o
  procurement, valores em MZN introduzidos pelo operador: produto + serviço +
  estimativa de transporte) → aprovação do cliente → **factura de PRODUTO**
  (produto + serviço) paga → produto comprado;
- **ENVIO_DIRECTO** — o cliente compra e envia para o armazém Connex na China
  (aguarda chegada).

Ambos convergem quando a mercadoria é **recebida e medida** no armazém da China
(`/api/pedidos/{id}/receber-medir`): aí nasce a `Encomenda` física (com peso e
dimensões reais) e segue o fluxo de estados de sempre. A estimativa de transporte
da cotação é só indicativa; o **frete real** sai do peso medido (ver abaixo).

A factura de transporte deve ser paga **até 3 dias** após a disponibilidade em
Maputo; depois disso acumula **multa de 200 MZN/dia** (`MULTA_VALOR_DIA`,
`MULTA_DIAS_TOLERANCIA`), calculada em tempo real e mostrada no detalhe da encomenda.

**Anexos:** pedidos, encomendas e facturas aceitam documentos (foto do produto,
factura do fornecedor, fotos reais no armazém, despacho, comprovativo de pagamento).
Ficam em `backend/uploads/` e o cliente vê no portal os marcados como visíveis; pode
também carregar o seu comprovativo (`/api/portal/anexos`).

> ISPC: nas facturas de PRODUTO, o volume de negócios conta **apenas o serviço de
> compra** (o custo do produto é reembolso por conta do cliente, não facturação).

## Fluxo principal

1. Operador regista cliente (opcionalmente com senha de acesso ao portal) e encomenda → sistema gera código de rastreio `CNX-XXXXXX`;
2. O estado muda manualmente (operador) ou automaticamente (job de sincronização com a API de tracking, a cada 30 min);
3. Cada mudança de estado gera um evento de tracking + notificação ao cliente;
4. O cliente consulta de duas formas:
   - **Consulta rápida** (`/rastrear`): pelo código, sem conta;
   - **Portal do cliente** (`/portal`): login com telefone + senha → vê todas as suas encomendas (com histórico) e facturas.

Nota: se a base de dados já existia antes do portal, acrescentar a coluna:
`ALTER TABLE clientes ADD COLUMN senha_hash VARCHAR(255) NULL;`

Se já existia antes do **processo de importação (Pedido)**, correr a migração
`docs/migracao_pedidos.sql` (cria `pedidos`, `itens_pedido`, `anexos` e acrescenta
colunas a `encomendas`, `facturas` e `notificacoes`). Em bases novas nada é preciso —
o arranque cria tudo automaticamente.

E, se já existia antes do cálculo de frete por dimensões, acrescentar:
```sql
ALTER TABLE encomendas
  ADD COLUMN comprimento_cm DECIMAL(10,2) NULL AFTER peso_kg,
  ADD COLUMN largura_cm DECIMAL(10,2) NULL AFTER comprimento_cm,
  ADD COLUMN altura_cm DECIMAL(10,2) NULL AFTER largura_cm;
```

## Cálculo do frete

O valor do frete é calculado automaticamente ao registar/actualizar a encomenda:

- **Peso volumétrico** = (Comprimento × Largura × Altura, em cm) ÷ `DIVISOR_VOLUMETRICO` (6000);
- **Peso cobrável** = o **maior** entre o peso real (balança) e o peso volumétrico;
- **Valor do frete** = peso cobrável × `TARIFA_POR_KG` (1800 MZN/kg).

A tarifa e o divisor ficam guardados na base de dados (tabela `configuracao_frete`) e
são **editáveis no frontend** em **Configuração** (só administradores). Os valores em
`.env` (`TARIFA_POR_KG`, `DIVISOR_VOLUMETRICO`) servem apenas como semente inicial.
Cada alteração fica registada na auditoria (`logs_configuracao_frete`): quem alterou,
quando e a descrição "campo: antes → depois" — visível na mesma página.

Exemplo: caixa 100×50×40 cm → 200000 ÷ 6000 = 33,33 kg; se o peso real for 30 kg,
cobram-se 33,33 kg × 1800 = **59 994 MZN**.

Ao **emitir a factura** o valor vem automaticamente deste frete (pode emitir-se com um
clique, ou indicar outro valor). A factura congela a **base de cálculo** no momento da
emissão (peso cobrável + tarifa aplicada) e mostra-a no documento.

## ISPC (Imposto Simplificado para Pequenos Contribuintes)

A empresa está enquadrada no **ISPC**, pelo que **não cobra IVA** nas facturas. O ISPC
incide sobre o **volume de negócios** e é declarado trimestralmente no **Modelo 30** da
Autoridade Tributária (pagamento em Abril, Julho, Outubro e Janeiro do ano seguinte).

O método de cálculo é configurável em **Configuração** (com auditoria):
- **Progressiva** (alterações de 2025): 3% até 1.000.000 MZN/ano, 4% até 2.500.000, 5% acima;
- **Percentagem fixa** (ex.: 3%);
- **Quota fixa anual** (ex.: 75.000 MZN).

No 1.º ano de actividade a percentagem é reduzida a metade (opção activável).

A página **Declaração ISPC** apresenta, por ano, o volume de negócios de cada trimestre
(total das facturas **pagas**), a taxa aplicada e o ISPC devido. Em cada trimestre há
**"Gerar declaração"**, que produz um documento imprimível (PDF) — a **Declaração / Guia
de Pagamento do ISPC (Modelo 30)** — com a identificação do contribuinte, o período, o
apuramento do imposto e a linha de assinatura, pronto a submeter na Direcção da Área
Fiscal. Valores por defeito em `.env`: `ISPC_METODO`, `ISPC_PERCENTAGEM`,
`ISPC_QUOTA_ANUAL`, `ISPC_PRIMEIRO_ANO`.

Os **dados do contribuinte** (designação, NUIT, endereço, telefone, DAF e declarante)
são editáveis em **Configuração** e usados no cabeçalho das facturas e na declaração.

## Estados da encomenda

REGISTADA → RECEBIDA_CHINA → EMBARCADA → EM_TRANSITO → CHEGOU_MOCAMBIQUE →
DESALFANDEGADA → DISPONIVEL_LEVANTAMENTO → ENTREGUE (+ ATRASADA como estado de excepção)
