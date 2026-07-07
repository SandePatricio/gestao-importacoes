# Guia de Estudo — Sistema de Gestão de Encomendas Aéreas (Connex Importações)

> **Para quem é este documento?** Para quem vai **apresentar e defender** este
> projeto sem ser, à partida, especialista em programação. Está escrito em
> linguagem simples, com analogias, e vai do "o que o sistema faz" até "como
> está construído por dentro". No fim há uma secção de **perguntas prováveis do
> júri** com respostas. Lê de cima para baixo — cada secção prepara a seguinte.

---

## Índice

1. [O problema do mundo real](#1-o-problema-do-mundo-real)
2. [O que o sistema faz (visão geral)](#2-o-que-o-sistema-faz-visão-geral)
3. [Quem usa o sistema (atores)](#3-quem-usa-o-sistema-atores)
4. [Glossário rápido](#4-glossário-rápido)
5. [As tecnologias — o quê e porquê](#5-as-tecnologias--o-quê-e-porquê)
6. [A arquitetura em camadas](#6-a-arquitetura-em-camadas)
7. [O backend por dentro](#7-o-backend-por-dentro)
8. [O modelo de dados (as tabelas)](#8-o-modelo-de-dados-as-tabelas)
9. [O frontend por dentro](#9-o-frontend-por-dentro)
10. [Os fluxos principais, passo a passo](#10-os-fluxos-principais-passo-a-passo)
11. [Cálculo do frete, faturação e ISPC](#11-cálculo-do-frete-faturação-e-ispc)
12. [Segurança](#12-segurança)
13. [A funcionalidade nova: apagar/inativar pedido](#13-a-funcionalidade-nova-apagarinativar-pedido)
14. [Requisitos do sistema](#14-requisitos-do-sistema)
15. [Como pôr a funcionar e demonstrar](#15-como-pôr-a-funcionar-e-demonstrar)
16. [Perguntas prováveis do júri (com respostas)](#16-perguntas-prováveis-do-júri-com-respostas)

---

## 1. O problema do mundo real

A **Connex Importações** ajuda clientes em Moçambique a comprar produtos na China
e a recebê-los por via aérea. Este negócio tem muitas etapas e muita gente
envolvida: o cliente que quer o produto, o operador que trata da compra, o
armazém na China, a transportadora, a alfândega, e por fim a entrega em Maputo.

Sem um sistema, tudo isto vive em cadernos, folhas de Excel e mensagens de
WhatsApp. Os problemas típicos:

- O cliente liga a toda a hora a perguntar "onde está a minha encomenda?".
- É difícil saber quanto cobrar de transporte (depende do peso e do tamanho).
- As faturas e os impostos são feitos à mão, com risco de erro.
- Não há histórico fiável do que aconteceu a cada encomenda.

**O sistema resolve isto**: centraliza tudo num só lugar, calcula
automaticamente os valores, avisa o cliente a cada passo, e dá-lhe um portal
onde ele próprio consulta o estado da sua encomenda.

> **Frase para a defesa:** *"O projeto informatiza todo o ciclo de importação
> aérea China→Moçambique da Connex, desde o pedido de cotação até à entrega,
> automatizando cálculos de frete, faturação, impostos e comunicação com o
> cliente."*

---

## 2. O que o sistema faz (visão geral)

O sistema acompanha dois grandes momentos:

**A) O Pedido (fase "antes da carga existir")** — código `PED-XXXXXX`.
É o processo de importação: o cliente diz o que quer, a empresa faz a **cotação**
(orçamento), o cliente aprova, paga o produto, e a empresa compra-o. Há dois modos:

- **COM_COMPRA** — a Connex compra o produto ao fornecedor em nome do cliente.
- **ENVIO_DIRECTO** — o cliente compra sozinho e só envia para o armazém da
  Connex na China.

**B) A Encomenda (fase "carga física")** — código `CNX-XXXXXX`.
Quando a mercadoria chega ao armazém da China e é **pesada e medida**, o Pedido
transforma-se numa **Encomenda**. A partir daí segue os estados físicos:
recebida na China → embarcada → em trânsito → chegou a Moçambique → desalfandegada
→ disponível para levantamento → entregue.

Ao longo de tudo isto o sistema ainda:

- **Calcula o frete** automaticamente (com base no peso e nas dimensões).
- **Emite faturas** (de produto e de transporte) e regista pagamentos.
- **Calcula o imposto ISPC** e gera a declaração para a Autoridade Tributária.
- **Notifica o cliente** a cada mudança de estado.
- **Sincroniza** automaticamente com uma empresa externa de rastreio (17TRACK).
- Guarda **anexos** (fotos do produto, faturas do fornecedor, comprovativos).

---

## 3. Quem usa o sistema (atores)

| Ator | Quem é | O que faz |
|------|--------|-----------|
| **Administrador** | Dono/gestor | Tudo, incluindo gerir utilizadores e configurações (frete, ISPC). |
| **Operador** | Funcionário | Regista clientes, pedidos e encomendas; atualiza estados; emite faturas. |
| **Cliente** | Quem importa | Entra no **portal** (telefone + senha), vê os seus pedidos/encomendas e faturas, aprova cotações e envia comprovativos. |
| **Público** | Qualquer pessoa | Consulta o estado de uma encomenda pelo **código**, sem precisar de conta. |
| **Sistema** | O próprio software | Sincroniza rastreio, gera eventos e notificações automaticamente. |

> "Ator" é o termo de engenharia de software para "tipo de utilizador que
> interage com o sistema". É o que aparece no **diagrama de casos de uso**
> (`docs/diagramas/01-casos-de-uso.puml`).

---

## 4. Glossário rápido

| Termo | Explicação simples |
|-------|--------------------|
| **Backend** | A parte "por trás", que não se vê: guarda os dados e aplica as regras. É o "cérebro". |
| **Frontend** | A parte que se vê no browser: os ecrãs, botões e formulários. É a "cara". |
| **API** | A "porta de entrada" do backend. O frontend faz pedidos à API e recebe respostas. |
| **REST / endpoint** | Cada "porta" concreta da API tem um endereço (ex.: `/api/pedidos`) e um verbo (GET=ler, POST=criar, PUT=alterar, DELETE=apagar). |
| **Base de dados** | Onde os dados ficam guardados de forma organizada, em tabelas (como folhas de Excel ligadas entre si). |
| **JSON** | O formato de texto em que frontend e backend trocam informação (pares "nome: valor"). |
| **JWT (token)** | Um "crachá digital" que prova quem está autenticado, sem ter de mandar a senha a cada pedido. |
| **SPA** | *Single Page Application* — a web app carrega uma vez e muda de ecrã sem recarregar a página. |
| **Soft delete** | "Apagar" escondendo o registo, sem o eliminar de verdade (é reversível). |

---

## 5. As tecnologias — o quê e porquê

Pensa no sistema como um **restaurante**: o frontend é a sala e o menu (o que o
cliente vê), o backend é a cozinha (onde se prepara tudo), e a base de dados é a
despensa (onde se guardam os ingredientes).

### Backend (a cozinha) — **Python + FastAPI**
- **Python** — linguagem de programação simples de ler, muito usada.
- **FastAPI** — a "estrutura" (framework) que constrói a API. É rápida e cria
  **sozinha** a documentação interativa (Swagger) em `/docs`.
- **SQLAlchemy** — o "tradutor" entre o código Python e a base de dados. Permite
  trabalhar com **objetos** em vez de escrever SQL à mão (chama-se ORM).
- **MySQL** — a base de dados relacional (a despensa organizada).
- **Pydantic** — valida os dados que entram e saem (garante que um preço é
  mesmo um número, um email é mesmo um email, etc.).
- **PyJWT + bcrypt** — segurança: tokens de sessão e senhas cifradas.
- **APScheduler** — o "despertador" que corre tarefas sozinho de tempos a tempos
  (ex.: sincronizar o rastreio a cada 30 minutos).
- **httpx** — faz chamadas à API externa de rastreio (17TRACK).

### Frontend (a sala) — **React + Tailwind**
- **React** — biblioteca para construir interfaces em "peças" reutilizáveis
  (componentes). Ex.: um botão, uma tabela, um cartão de fatura.
- **Vite** — a ferramenta que arranca o frontend e o prepara para produção.
- **Tailwind CSS** — forma rápida de dar estilo (cores, espaçamentos) escrevendo
  "classes" diretamente no HTML.
- **React Router** — gere a navegação entre "páginas" dentro da SPA.

> **Porquê separar frontend e backend?** Porque cada um pode ser desenvolvido e
> testado à parte, e o mesmo backend poderia servir também, por exemplo, uma app
> de telemóvel no futuro. É uma arquitetura **cliente–servidor**.

---

## 6. A arquitetura em camadas

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (o cliente)                                          │
│  Frontend React (SPA)  ── ecrãs, formulários, botões         │
└───────────────┬─────────────────────────────────────────────┘
                │  pedidos HTTP (JSON) + token JWT
                ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVIDOR                                                     │
│  Backend FastAPI                                             │
│    ┌──────────────┐  ┌───────────────┐  ┌────────────────┐   │
│    │  Routers     │→ │  Services     │→ │  Models        │   │
│    │  (as portas) │  │ (regras de    │  │ (as tabelas)   │   │
│    │              │  │  negócio)     │  │                │   │
│    └──────────────┘  └───────────────┘  └────────┬───────┘   │
│                                                   │           │
│         Job agendado (APScheduler) ──┐            │           │
└────────────────────────────────────┼─────────────┼───────────┘
                                      │             ▼
              ┌───────────────────────┘   ┌──────────────────┐
              ▼                            │  MySQL           │
   ┌──────────────────┐                   │ (base de dados)  │
   │ API 17TRACK       │                   └──────────────────┘
   │ (rastreio externo)│
   └──────────────────┘
```

O backend está organizado em **três camadas** (é o padrão que dá manutenção
fácil — requisito **RNF06**):

1. **Routers** (`app/routers/`) — as "portas" da API. Recebem o pedido, verificam
   quem está autenticado e devolvem a resposta. **Não têm lógica complicada.**
2. **Services** (`app/services/`) — o "cérebro". É onde vivem as **regras de
   negócio**: como calcular o frete, que estados um pedido pode ter a seguir,
   como numerar uma fatura, etc.
3. **Models** (`app/models/`) — a definição das **tabelas** da base de dados em
   código Python.

> **Analogia:** o router é o **empregado de mesa** (anota o pedido), o service é o
> **chef** (sabe as receitas), e o model é a **despensa organizada por prateleiras**.

---

## 7. O backend por dentro

Estrutura de pastas (`backend/app/`):

```
main.py            → arranca a aplicação, liga tudo, cria as tabelas
core/              → "infraestrutura": ligação à BD, segurança, configuração
  database.py        ligação ao MySQL
  security.py        senhas (bcrypt) e tokens (JWT)
  deps.py            "quem está autenticado?" (dependências)
  config.py          leitura das definições (.env)
  storage.py         guardar ficheiros/anexos
models/            → as tabelas (models.py) e as listas de estados (enums.py)
schemas/           → o "formato" dos dados que entram/saem (Pydantic)
routers/           → as portas da API, um ficheiro por assunto
services/          → as regras de negócio, um ficheiro por assunto
jobs/              → tarefas automáticas (sync_tracking.py)
```

### Um pedido HTTP, do início ao fim (exemplo real)

Quando o operador clica em **"Aprovar cotação"** no ecrã, acontece isto:

1. O **frontend** envia `POST /api/pedidos/5/aprovar` com o crachá (token) no cabeçalho.
2. O **router** [`pedidos.py`](../backend/app/routers/pedidos.py) recebe. O FastAPI
   já verificou o token (linha `dependencies=[Depends(get_utilizador_actual)]`).
3. O router chama o **service** `pedido_service.mudar_estado_pedido(...)`.
4. O **service** verifica se a transição de estado é permitida (não se pode
   "aprovar" um pedido já cancelado, por exemplo), muda o estado, grava a data e
   cria uma **notificação** para o cliente.
5. Grava na **base de dados** (via SQLAlchemy) e devolve o pedido atualizado.
6. O **schema** `PedidoDetalheOut` transforma o objeto em **JSON** limpo.
7. O **frontend** recebe o JSON e atualiza o ecrã.

Este caminho **router → service → model → base de dados** repete-se em quase
todas as funcionalidades. É a espinha dorsal do sistema.

### A "máquina de estados" do pedido

Um conceito importante para a defesa: o pedido não pode saltar de qualquer estado
para qualquer outro. Existe um **mapa de transições válidas** em
[`pedido_service.py`](../backend/app/services/pedido_service.py). Por exemplo, no
modo COM_COMPRA:

```
SOLICITACAO_RECEBIDA → COTACAO_ENVIADA → APROVADA → PRODUTO_PAGO
   → PRODUTO_COMPRADO → RECEBIDO_MEDIDO → EM_EXECUCAO → CONCLUIDO
(a partir de quase qualquer ponto pode ir para CANCELADO)
```

Isto chama-se **máquina de estados finitos** e garante que o processo segue
sempre a ordem correta. Se alguém tentar uma transição inválida, o sistema
recusa com uma mensagem clara.

---

## 8. O modelo de dados (as tabelas)

A base de dados tem estas tabelas principais (ver
[`models.py`](../backend/app/models/models.py) e o diagrama
`docs/diagramas/03-mer.md`):

| Tabela | Guarda | Ligações importantes |
|--------|--------|----------------------|
| **utilizadores** | Funcionários (admin/operador) | — |
| **clientes** | Quem importa | tem muitas encomendas e pedidos |
| **pedidos** | O processo de importação (`PED-`) | pertence a um cliente; dá origem a uma encomenda |
| **itens_pedido** | Cada produto dentro de um pedido | pertence a um pedido |
| **encomendas** | A carga física (`CNX-`) | pertence a um cliente; nasce de um pedido |
| **eventos_tracking** | O histórico de estados de cada encomenda | pertence a uma encomenda |
| **facturas** | Faturas de PRODUTO ou de TRANSPORTE | ligam-se a um pedido **ou** a uma encomenda |
| **notificacoes** | Mensagens ao cliente | ligam-se a um pedido ou encomenda |
| **anexos** | Ficheiros (fotos, comprovativos) | ligam-se a pedido, encomenda ou fatura |
| **configuracao_frete** | Parâmetros de frete e ISPC + dados fiscais | linha única (id=1) |
| **logs_configuracao_frete** | Auditoria: quem mudou a configuração e quando | — |

### As relações em linguagem simples

- Um **cliente** tem **vários pedidos** e **várias encomendas** (relação "um para muitos").
- Um **pedido** tem **vários itens** e transforma-se em **uma encomenda**.
- Uma **encomenda** tem **vários eventos de tracking** (o seu histórico).
- Uma **fatura** é de **produto** (ligada ao pedido) **ou** de **transporte**
  (ligada à encomenda) — nunca das duas.

> **Chave estrangeira** é a "cola" entre tabelas: a coluna `cliente_id` na tabela
> de pedidos aponta para a linha do cliente na tabela de clientes. Garante
> **integridade** (requisito RNF08): não há um pedido sem cliente válido.

### Campos "calculados" (não guardados)

Alguns valores **não estão numa coluna** — são calculados no momento, no código:
- **Peso volumétrico** e **peso cobrável** da encomenda.
- A **multa** por atraso no pagamento do transporte (conta os dias em tempo real).
- Os **totais** do pedido (produto + serviço + estimativa de transporte).

Isto evita guardar valores que ficariam desatualizados. É uma boa prática.

---

## 9. O frontend por dentro

O frontend é uma **SPA** (Single Page Application): o browser carrega a app uma
vez e depois muda de ecrã sem recarregar a página, o que a torna rápida e fluida.

Estrutura (`frontend/src/`):

```
main.jsx           → arranca a app
App.jsx            → o "mapa" das páginas (rotas)
context/           → estado partilhado (ex.: quem está autenticado)
components/        → peças reutilizáveis (Layout, Anexos, documentos PDF)
pages/             → um ficheiro por ecrã (Pedidos, Encomendas, Faturas, ...)
services/
  api.js             → o único ponto que fala com o backend
  estados.js         → nomes e cores dos estados (tradução para português)
```

### Como o frontend fala com o backend

Todo o contacto com o backend passa por um único ficheiro,
[`api.js`](../frontend/src/services/api.js). Ele:
- Junta automaticamente o **token** (crachá) a cada pedido.
- Se o token expirou (resposta 401), manda o utilizador de volta ao login.
- Transforma as respostas em objetos prontos a usar e normaliza os erros.

Exemplo: `api.get("/api/pedidos")` vai buscar a lista de pedidos;
`api.del("/api/pedidos/5")` apaga (inativa) o pedido 5.

### As páginas (rotas), em `App.jsx`

| Rota | Ecrã | Quem acede |
|------|------|-----------|
| `/login` | Entrada de funcionários | Admin/Operador |
| `/dashboard` | Estatísticas gerais | Admin/Operador |
| `/pedidos`, `/pedidos/:id` | Lista e detalhe de pedidos | Admin/Operador |
| `/encomendas`, `/encomendas/:id` | Lista e detalhe de encomendas | Admin/Operador |
| `/clientes`, `/facturas`, `/utilizadores`, `/configuracao`, `/fiscal` | Gestão | Admin/Operador |
| `/portal` | Portal do cliente | Cliente |
| `/rastrear` | Consulta pública por código | Qualquer pessoa |

As rotas de gestão estão **protegidas**: sem token válido, o utilizador é
redirecionado para o login.

---

## 10. Os fluxos principais, passo a passo

### Fluxo A — Importação COM_COMPRA (a Connex compra)

1. **Solicitação** — cliente (ou operador) abre um pedido com os produtos desejados.
2. **Cotação** — depois de consultar o fornecedor, o operador introduz os valores
   em MZN (preço do produto + serviço de compra + estimativa de transporte).
3. **Aprovação** — o cliente aprova a cotação (no portal, ou o operador em nome dele).
4. **Fatura de PRODUTO** — é emitida (produto + serviço) e o cliente paga.
5. **Produto comprado** — a Connex compra ao fornecedor.
6. **Receção e medição** na China — pesa-se e mede-se a carga. **Aqui nasce a
   Encomenda física.**
7. A partir daqui segue o **fluxo físico** (ver abaixo) e, no fim, é emitida a
   **fatura de TRANSPORTE** com o frete real.

### Fluxo B — ENVIO_DIRECTO (o cliente compra e envia)

O cliente compra sozinho e envia a mercadoria para o armazém da Connex na China.
O pedido começa já em "aguarda armazém China" e junta-se ao fluxo A no passo 6
(receção e medição).

### Fluxo físico da Encomenda (comum aos dois)

```
REGISTADA → RECEBIDA_CHINA → EMBARCADA → EM_TRANSITO → CHEGOU_MOCAMBIQUE
   → DESALFANDEGADA → DISPONIVEL_LEVANTAMENTO → ENTREGUE
                                   (ATRASADA = estado de exceção)
```

A cada mudança de estado, o sistema:
- Cria um **evento de tracking** (fica no histórico).
- Gera uma **notificação** ao cliente (por email, se configurado).

### Sincronização automática do rastreio

Um **job** corre a cada 30 minutos ([`sync_tracking.py`](../backend/app/jobs/sync_tracking.py))
e pergunta à **17TRACK** (empresa externa) se há novidades sobre as encomendas
que têm código de rastreio internacional. Se a API externa falhar, **o sistema
continua a funcionar** (requisito RNF04) — a consulta do cliente lê sempre o
estado guardado localmente, não depende do exterior (RNF03).

---

## 11. Cálculo do frete, faturação e ISPC

### Frete (transporte aéreo)

Nas transportadoras aéreas paga-se pelo **maior** entre o peso real e o "peso do
espaço ocupado". A fórmula:

- **Peso volumétrico** = (Comprimento × Largura × Altura, em cm) ÷ **6000**.
- **Peso cobrável** = o maior entre o peso real (balança) e o volumétrico.
- **Frete** = peso cobrável × **tarifa por kg** (por defeito 1800 MZN/kg).

> **Exemplo:** caixa de 100×50×40 cm → 200 000 ÷ 6000 = 33,33 kg. Se pesar só
> 30 kg na balança, cobram-se os **33,33 kg** (o maior) × 1800 = **59 994 MZN**.
> Isto explica-se: uma caixa leve mas enorme ocupa espaço no avião.

A tarifa e o divisor **não estão fixos no código** — ficam na tabela
`configuracao_frete` e são **editáveis** pelo administrador na página
Configuração. Cada alteração fica registada na **auditoria**.

### Faturação

Há dois tipos de fatura:
- **PRODUTO** — produto + serviço de compra (paga no início, modo COM_COMPRA).
- **TRANSPORTE** — o frete real, emitido após a pesagem.

A fatura **congela** a base de cálculo (peso cobrável e tarifa usados), para que,
mesmo que a tarifa mude no futuro, a fatura antiga continue a justificar o seu valor.

Há ainda uma **multa** de 200 MZN/dia se o frete não for pago até 3 dias após a
mercadoria ficar disponível em Maputo (calculada em tempo real).

### ISPC (o imposto)

A empresa está enquadrada no **Imposto Simplificado para Pequenos Contribuintes**,
por isso **não cobra IVA**. O ISPC incide sobre o **volume de negócios** e é
declarado trimestralmente (Modelo 30 da Autoridade Tributária). O sistema:
- Calcula o imposto (método configurável: progressiva, percentagem fixa ou quota anual).
- Gera uma **declaração imprimível** (PDF) pronta a entregar.

> Detalhe importante para a defesa: nas faturas de **produto**, só o **serviço de
> compra** conta para o volume de negócios — o custo do produto é reembolso do
> cliente, não é faturação da empresa.

---

## 12. Segurança

| Medida | O que faz | Onde |
|--------|-----------|------|
| **Senhas cifradas (bcrypt)** | As senhas nunca são guardadas em texto; guarda-se um "resumo" irreversível. | `core/security.py` |
| **Tokens JWT com expiração** | Depois do login, o utilizador recebe um crachá temporário. | `core/security.py` |
| **Sessões isoladas** | Um token de **cliente** não abre a área de gestão, e vice-versa (claim `tipo` no token). | RNF09 |
| **Endpoints protegidos** | As portas de gestão exigem autenticação; criar utilizadores só o admin. | `core/deps.py` |
| **CORS** | O backend só aceita pedidos do endereço do frontend. | `main.py` |
| **Validação de dados (Pydantic)** | Dados mal formados são recusados antes de chegar à lógica. | `schemas/` |

---

## 13. A funcionalidade nova: apagar/inativar pedido

Esta foi a **última alteração** feita ao sistema, por isso é provável que te
perguntem sobre ela. Explica-se assim:

### O problema
O cliente pediu uma forma de **"apagar" um pedido**. Mas apagar mesmo (eliminar
da base de dados) seria perigoso: perder-se-ia o histórico (faturas, notificações,
eventualmente a encomenda associada).

### A solução: *soft delete* (apagar "de mentira")
Em vez de eliminar, marca-se o pedido como **inativo**. Ele:
- **Desaparece** das listagens normais (do operador e do cliente).
- **Mantém** todo o histórico na base de dados.
- Pode ser **reposto** (é reversível).

Tecnicamente, acrescentou-se uma coluna `activo` (verdadeiro/falso) à tabela
`pedidos`. As listagens passaram a mostrar só os `activo = verdadeiro`.

### Diferença entre "Cancelar" e "Apagar"
| Ação | O que é | Fica visível? |
|------|---------|---------------|
| **Cancelar** | Uma **decisão de negócio** — o processo foi cancelado (estado `CANCELADO`). | Sim, continua na lista. |
| **Apagar (inativar)** | **Esconder** um registo (ex.: criado por engano). | Não, some da lista, mas é reversível. |

### Onde está no código
- Backend: novo campo em [`models.py`](../backend/app/models/models.py) e os
  endpoints `DELETE /api/pedidos/{id}` (inativar) e
  `POST /api/pedidos/{id}/reactivar` (repor) em
  [`pedidos.py`](../backend/app/routers/pedidos.py).
- Frontend: botão **"Apagar pedido (inactivar)"** em
  [`PedidoDetalhe.jsx`](../frontend/src/pages/PedidoDetalhe.jsx).

> **O conceito-chave a saber dizer:** *"Usei soft delete em vez de eliminação
> física para preservar o histórico e a integridade referencial, tornando a
> operação reversível."*

---

## 14. Requisitos do sistema

Os requisitos estão em [`docs/requisitos.md`](requisitos.md). Resumo do que
importa saber:

- **Requisitos Funcionais (RF01–RF17):** o que o sistema **faz** — autenticar,
  gerir clientes, registar encomendas, gerar código de rastreio, atualizar
  estados, notificar, sincronizar tracking, faturar, dashboard, portal do
  cliente, etc.
- **Requisitos Não Funcionais (RNF01–RNF09):** **como** o sistema se comporta —
  segurança (bcrypt, JWT), desempenho (consulta pública sem depender do exterior),
  disponibilidade (tolerante a falhas da API externa), usabilidade (responsivo,
  em português), manutenibilidade (arquitetura em camadas), portabilidade (API
  documentada), integridade (BD relacional com chaves estrangeiras).

Sabe explicar **pelo menos 3 de cada** com um exemplo concreto.

---

## 15. Como pôr a funcionar e demonstrar

Passos resumidos (detalhe em [`LEIA-ME_ENTREGA.md`](../LEIA-ME_ENTREGA.md)):

```sh
# 1. Base de dados (MySQL a correr, ex.: XAMPP)
mysql -u root < docs/dump_gestao_importacoes_20260704.sql

# 2. Backend  —  macOS / Linux
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/uvicorn app.main:app --reload      # API em http://localhost:8000

# 3. Frontend (noutro terminal)
cd frontend
npm install
npm run dev                                    # web em http://localhost:5173
```

> **No Windows** a pasta da venv é `.venv\Scripts\` (barra invertida), não
> `.venv/bin/`. O passo 2 fica:
> ```bat
> cd backend
> python -m venv .venv
> .venv\Scripts\pip install -r requirements.txt
> copy .env.example .env
> .venv\Scripts\uvicorn app.main:app --reload
> ```
> Os passos 1 (mysql) e 3 (npm) são iguais nos dois sistemas.

Login inicial: `admin@conneximportacoes.co.mz` / `admin123`.

**Guião de demonstração sugerido para a defesa:**
1. Login como operador → mostrar o **Dashboard**.
2. Criar um **cliente** e um **pedido** (COM_COMPRA).
3. Preencher a **cotação** e aprová-la.
4. Emitir e pagar a **fatura de produto**.
5. Fazer **receber e medir** → mostrar a **encomenda** a nascer e o **frete**
   calculado automaticamente.
6. Mudar estados da encomenda → mostrar os **eventos** e **notificações**.
7. Mostrar o **portal do cliente** e a **consulta pública** por código.
8. Mostrar a nova função: **Apagar (inativar) um pedido** e depois **repô-lo**.
9. Mostrar a documentação automática da API em `http://localhost:8000/docs`.

---

## 16. Perguntas prováveis do júri (com respostas)

**P: Porque separaste o frontend do backend?**
R: Para ter uma arquitetura cliente–servidor: cada parte evolui e testa-se
isoladamente, e o mesmo backend pode servir outros clientes no futuro (ex.: uma
app móvel). Comunicam por uma API REST em JSON.

**P: O que é um ORM e porque usaste SQLAlchemy?**
R: ORM (Object-Relational Mapping) é um tradutor entre objetos do código e as
tabelas da base de dados. Escrevo Python em vez de SQL manual, o que reduz erros
e torna o código mais legível e portável.

**P: Como garantes que um pedido não salta etapas?**
R: Com uma máquina de estados finitos: há um mapa de transições válidas no
service; qualquer transição fora do mapa é recusada com erro.

**P: Onde estão as regras de negócio?**
R: Centralizadas na camada de **services**. Os routers só recebem/respondem e os
models só representam dados. É o requisito de manutenibilidade (RNF06).

**P: Como funciona a autenticação?**
R: O utilizador faz login, o backend verifica a senha (comparando com o hash
bcrypt) e devolve um token JWT com validade. Esse token acompanha cada pedido
seguinte; o backend valida-o sem precisar da senha de novo. Tokens de cliente e
de funcionário são isolados por um campo no próprio token.

**P: E se a API de rastreio externa estiver em baixo?**
R: O sistema continua a funcionar. A sincronização é tolerante a falhas e a
consulta do cliente lê sempre o estado guardado localmente (RNF03, RNF04).

**P: Porque o frete usa peso volumétrico?**
R: Porque no transporte aéreo se paga o espaço ocupado. Uma caixa grande mas leve
ocuparia espaço "grátis"; o peso volumétrico corrige isso. Cobra-se o maior dos dois.

**P: Explica a diferença entre apagar e cancelar um pedido.**
R: Cancelar é um estado de negócio (o processo terminou por cancelamento) e fica
visível. Apagar é um *soft delete*: esconde o registo das listas mas preserva o
histórico e é reversível. Optei por *soft delete* para não perder integridade.

**P: Porque a empresa não cobra IVA?**
R: Está enquadrada no regime ISPC (Pequenos Contribuintes), que substitui o IVA e
o IRPC por um imposto simplificado sobre o volume de negócios, declarado
trimestralmente no Modelo 30.

**P: Onde ficam guardados os ficheiros (fotos, comprovativos)?**
R: Em disco, na pasta `backend/uploads/`, organizados por ano/mês; na base de
dados guarda-se apenas o caminho e os metadados (tabela `anexos`).

**P: Como é criada a base de dados na primeira execução?**
R: Ao arrancar, o backend chama `Base.metadata.create_all()`, que cria as tabelas
que ainda não existam. Para bases já existentes há scripts de migração em `docs/`.

---

### Nota final de estudo

Se só puderes decorar **cinco ideias**, decora estas:
1. **Dois mundos**: Pedido (`PED-`, antes) → Encomenda (`CNX-`, carga física).
2. **Três camadas**: routers → services → models.
3. **Frontend React** fala com **backend FastAPI** por **API REST/JSON** com **token JWT**.
4. **Frete** = maior(peso real, volumétrico) × tarifa; **ISPC** substitui o IVA.
5. **Apagar pedido = soft delete** (esconde, não elimina; reversível).
