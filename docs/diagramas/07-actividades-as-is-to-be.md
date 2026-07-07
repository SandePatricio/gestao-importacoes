# Diagramas de Actividades — Processo Actual (AS-IS) vs Proposto (TO-BE)

## AS-IS — Processo manual actual (Capítulo 2 da monografia)

```mermaid
flowchart TD
    A([Encomenda chega à empresa]) --> B[Funcionário anota dados<br/>em caderno / WhatsApp]
    B --> C[Cliente quer saber o estado]
    C --> D[Cliente liga ou envia<br/>mensagem no WhatsApp]
    D --> E[Funcionário procura informação<br/>em conversas e registos dispersos]
    E --> F{Informação<br/>encontrada?}
    F -- Não --> G[Pede ao colega / verifica<br/>com o fornecedor na China]
    G --> E
    F -- Sim --> H[Responde manualmente ao cliente]
    H --> I[Emite factura manualmente]
    I --> J([Fim])

    style B fill:#fde68a
    style E fill:#fde68a
    style G fill:#fca5a5
```

**Problemas evidenciados:** informação dispersa, dependência de pessoas, demora na resposta, risco de erro e extravio de dados.

## TO-BE — Processo com o sistema proposto

```mermaid
flowchart TD
    A([Encomenda chega ao armazém]) --> B[Operador regista a encomenda no sistema]
    B --> C[Sistema gera código de rastreio<br/>CNX-XXXXXX e 1º evento]
    C --> D[Sistema notifica o cliente<br/>automaticamente por e-mail]
    D --> E{Estado muda?}
    E -- Operador actualiza --> F[Novo evento de tracking<br/>+ notificação automática]
    E -- Job sincroniza com<br/>API de tracking --> F
    F --> E
    E -- Encomenda disponível --> G[Cliente notificado<br/>para levantamento]
    G --> H[Operador emite factura no sistema]
    H --> I[Cliente levanta; estado = ENTREGUE]
    I --> J([Fim])

    K[Cliente consulta o estado<br/>na página pública, a qualquer momento] -.-> E

    style C fill:#bbf7d0
    style D fill:#bbf7d0
    style F fill:#bbf7d0
    style K fill:#bfdbfe
```
