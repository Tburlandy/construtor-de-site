# F1-003 — Implement project content repository

## Objetivo
Criar a persistência mínima de conteúdo por projeto, separada do repositório de metadados.

## Contexto
Hoje o sistema depende de um único `content/content.json`. O PRD exige conteúdo isolado por projeto. A ADR do MVP define persistência file-based por projeto.

## Por que essa task existe
Sem separar o conteúdo por projeto, o sistema continuará single-site mesmo que exista uma lista de projetos.

## Arquivos que devem ser lidos antes
- `docs/prd/00-product-prd.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `src/lib/content.ts`
- `src/content/schema.ts`
- `docs/backlog/cards/F1-003-implement-project-content-repository.md`
- artefatos criados em `F1-001`
- artefatos criados em `F1-002`

## Arquivos que podem ser alterados
- módulos novos mínimos de repositório de conteúdo
- `src/content/schema.ts` se ajuste contratual pontual for necessário para interoperabilidade
- lado node/tooling relacionado ao storage

## Arquivos que não devem ser alterados
- `src/pages/Studio.tsx`
- `src/App.tsx`
- `vite.config.ts`

## Escopo do que entra
- repositório de conteúdo por projeto
- leitura/escrita de conteúdo isolado por projeto
- compatibilidade mínima com o conteúdo atual

## Non-goals / o que não entra
- UI
- rotas
- migração completa do Studio
- build por projeto

## Passos sugeridos
1. definir unidade de persistência do conteúdo por projeto
2. implementar leitura/escrita
3. preservar estrutura do conteúdo existente
4. não acoplar ainda ao frontend

## Critérios de aceite
- conteúdo de projeto pode ser lido e gravado sem depender do JSON único global
- contrato é explícito e tipado
- o fluxo atual ainda não foi quebrado

## Validações obrigatórias
```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Riscos
- alterar cedo demais o fluxo do src/lib/content.ts
- fundir repositório de metadados com conteúdo

## Dependências
- F1-001
- F1-002

## Definição de pronto

Pronto quando existir persistência isolada de conteúdo por projeto pronta para ser conectada na API shell.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- contrato e local de persistência adotados;
- arquivos alterados;
- validações executadas;
- limitações;
- como isso destrava F2/F3.
