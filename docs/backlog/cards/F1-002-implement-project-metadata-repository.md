# F1-002 — Implement project metadata repository

## Objetivo
Criar a persistência mínima de metadados de projeto para suportar listagem, criação e abertura futura de projetos.

## Contexto
O PRD exige múltiplos projetos. O projeto atual não possui storage de projetos. A ADR do MVP define persistência file-based por projeto.

## Por que essa task existe
Sem repositório de metadados, não há entidade "projeto" para operar.

## Arquivos que devem ser lidos antes
- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/context/02-conventions.md`
- `docs/backlog/cards/F1-002-implement-project-metadata-repository.md`
- contratos criados em `F1-001`

## Arquivos que podem ser alterados
- módulos novos mínimos para persistência do lado node/tooling
- `studio-server.ts` ou módulo auxiliar relacionado, se o card precisar ancorar a persistência aí
- tipos/schemas relacionados ao repositório

## Arquivos que não devem ser alterados
- `src/pages/Studio.tsx`
- `src/App.tsx`
- páginas visuais

## Escopo do que entra
- persistência mínima de metadados de projeto
- operações mínimas de leitura/escrita de projeto
- contrato claro do repositório
- aderência à ADR file-based do MVP

## Non-goals / o que não entra
- conteúdo por projeto
- API pública da UI
- listagem visual
- build por projeto

## Passos sugeridos
1. usar a ADR definida em F0
2. implementar módulo mínimo de repositório
3. cobrir criação e leitura de projetos
4. manter a solução pequena e reversível

## Critérios de aceite
- existe um repositório mínimo para metadados de projeto
- o repositório é tipado
- não há vazamento de lógica visual

## Validações obrigatórias
```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Riscos
- já misturar conteúdo e metadados
- espalhar persistência em vários arquivos sem contrato único

## Dependências
- F1-001

## Definição de pronto
Pronto quando a entidade projeto puder ser persistida e recuperada por um contrato claro.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- abordagem de persistência aplicada;
- arquivos alterados;
- validações executadas;
- limitações;
- impacto para F2.
