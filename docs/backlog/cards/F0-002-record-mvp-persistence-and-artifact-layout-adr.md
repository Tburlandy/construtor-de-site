# F0-002 — Record MVP persistence and artifact layout ADR

## Objetivo
Registrar e, se necessário, ajustar a ADR concreta que define a persistência MVP e o layout de artefatos e mídia por projeto.

## Contexto
A execução do backlog depende de uma decisão estrutural clara. Sem uma ADR concreta, o agente pode inventar banco, paths ou layout de artefatos durante F1-F5.

## Por que essa task existe
Fecha a decisão arquitetural mínima do MVP antes de começar a implementação.

## Arquivos que devem ser lidos antes
- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/02-conventions.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/backlog/00-backlog-overview.md`

## Arquivos que podem ser alterados
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/execution/01-implementation-strategy.md`
- `docs/backlog/00-backlog-overview.md`
- `docs/backlog/01-card-index.md`

## Arquivos que não devem ser alterados
- arquivos de código do produto

## Escopo do que entra
- revisar a ADR inicial
- ajustar a decisão se houver inconsistência factual com o código
- alinhar backlog e estratégia à ADR final

## Non-goals / o que não entra
- implementar persistência
- criar banco
- criar APIs
- criar build novo

## Passos sugeridos
1. revisar PRD e arquitetura atual
2. revisar a ADR existente
3. ajustar a ADR se necessário
4. alinhar documentos dependentes

## Critérios de aceite
- existe uma ADR explícita e concreta para persistência MVP e layout de artefatos
- o backlog referencia essa ADR
- não restou ambiguidade estrutural material para F1

## Validações obrigatórias
- revisão manual de coerência documental

## Riscos
- deixar a ADR genérica demais
- registrar decisão incompatível com a arquitetura atual

## Dependências
- `F0-001`

## Definição de pronto
Pronto quando a ADR estiver suficiente para impedir improviso arquitetural nas fases seguintes.

## Instrução final de entrega para o agente
Ao concluir, responda com:
1. decisão final registrada;
2. documentos alterados;
3. impactos nas próximas fases;
4. limitações / assunções;
5. o que continua em aberto.
