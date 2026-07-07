# Requisitos do Sistema

Sistema de Gestão de Encomendas Aéreas — Connex Importações

## Requisitos Funcionais

| Código | Descrição | Actor |
|--------|-----------|-------|
| RF01 | Autenticar utilizadores internos (login com email e senha, token JWT) | Admin, Operador |
| RF02 | Gerir utilizadores internos com perfis (ADMIN, OPERADOR) | Admin |
| RF03 | Registar, consultar, actualizar e pesquisar clientes | Operador |
| RF04 | Registar encomendas com geração automática de código de rastreio único (CNX-XXXXXX) | Operador |
| RF05 | Actualizar o estado da encomenda segundo o ciclo de vida definido | Operador, Sistema |
| RF06 | Registar automaticamente um evento de tracking a cada mudança de estado | Sistema |
| RF07 | Gerar automaticamente uma notificação ao cliente a cada mudança de estado | Sistema |
| RF08 | Sincronizar periodicamente o estado das encomendas com a API externa de tracking | Sistema |
| RF09 | Permitir ao cliente consultar o estado da encomenda pelo código, sem autenticação | Cliente |
| RF10 | Emitir facturas associadas a encomendas, com numeração sequencial anual | Operador |
| RF11 | Registar o pagamento de facturas | Operador |
| RF12 | Apresentar dashboard com estatísticas operacionais (encomendas por estado, clientes, facturas pendentes) | Admin, Operador |
| RF13 | Filtrar encomendas por estado e por cliente | Operador |
| RF14 | Autenticar clientes no portal (telefone + senha de acesso definida no registo) | Cliente |
| RF15 | Permitir ao cliente autenticado consultar todas as suas encomendas (com histórico) e facturas | Cliente |
| RF16 | Permitir ao cliente alterar a sua própria senha no portal (validando a senha actual) | Cliente |
| RF17 | Gerir utilizadores internos: criar, editar, repor senha e activar/desactivar contas (sem permitir auto-desactivação) | Admin |

## Requisitos Não Funcionais

| Código | Categoria | Descrição |
|--------|-----------|-----------|
| RNF01 | Segurança | Senhas armazenadas com hash bcrypt; sessões com token JWT com expiração |
| RNF02 | Segurança | Endpoints de gestão acessíveis apenas a utilizadores autenticados; criação de utilizadores restrita a ADMIN |
| RNF09 | Segurança | Sessões de clientes e de funcionários isoladas (claim `tipo` no token JWT): um token de cliente não acede à área de gestão, nem o inverso |
| RNF03 | Desempenho | A consulta pública de tracking lê o estado guardado localmente (sem chamadas síncronas à API externa) |
| RNF04 | Disponibilidade | Falhas na API externa de tracking não afectam o funcionamento do sistema (sincronização tolerante a falhas) |
| RNF05 | Usabilidade | Interface web responsiva (React + Tailwind), em língua portuguesa |
| RNF06 | Manutenibilidade | Arquitectura em camadas (routers → services → models); regras de negócio centralizadas nos services |
| RNF07 | Portabilidade | API REST documentada automaticamente (OpenAPI/Swagger) |
| RNF08 | Integridade | Base de dados relacional (MySQL) com chaves estrangeiras e restrições de unicidade |
