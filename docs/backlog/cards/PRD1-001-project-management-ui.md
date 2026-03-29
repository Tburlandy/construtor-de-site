# PRD1-001 — Project management UI

## Objetivo

Concluir a base operacional de gestão multi-projeto na interface, criando a listagem de projetos e a shell do editor por projeto.

## Contexto

A persistência de projetos e a API shell já foram tratadas nas etapas anteriores. Agora é necessário materializar isso na interface para que o operador consiga visualizar projetos, criar novos e navegar até o editor shell de cada projeto.

## Por que essa task existe

Sem essa camada visual, a plataforma continua tecnicamente preparada, mas ainda não operacional para uso humano.

## Arquivos que devem ser lidos antes

- `docs/prd/00-product-prd.md`
- `docs/context/02-conventions.md`
- `docs/context/03-current-architecture.md`
- `docs/backlog/cards/F2-002-create-project-list-screen-shell.md`
- `docs/backlog/cards/F2-003-create-project-editor-shell.md`
- `src/App.tsx`
- `src/pages/Studio.tsx`
- artefatos criados em `F2-001`

## Arquivos que podem ser alterados

- `src/App.tsx`
- novos arquivos em `src/pages/`
- componentes pequenos em `src/components/` se necessários

## Arquivos que não devem ser alterados

- `src/lib/content.ts`
- `vite.config.ts`
- build/export/deploy
- repositórios de persistência já criados

## Escopo do que entra

- tela shell de listagem de projetos
- ação de criar novo projeto
- ação de abrir projeto
- rota do editor por projeto
- shell visual do editor por projeto
- carregamento mínimo do projeto selecionado

## Non-goals / o que não entra

- editor completo
- save real de conteúdo
- upload por projeto
- SEO completo
- build/export/deploy

## Passos sugeridos

1. criar rota de gestão de projetos
2. implementar tela de listagem
3. conectar a listagem à API shell existente
4. criar rota do editor por projeto
5. implementar a shell do editor
6. manter tudo simples e sem redesign amplo

## Critérios de aceite

- usuário consegue ver projetos existentes
- usuário consegue criar um novo projeto
- usuário consegue abrir um projeto existente
- existe uma rota funcional de editor por projeto
- a shell do editor não quebra o fluxo atual do app

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- tentar transformar a shell em editor completo
- mexer no layout além do necessário
- criar acoplamentos cedo demais com conteúdo real

## Dependências

- F2-001

## Definição de pronto

Pronto quando a gestão multi-projeto estiver visível e navegável na interface em nível shell, sem ainda implementar toda a edição real.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações;
- o que ainda falta para conteúdo real por projeto.

## Prompt para colar no Cursor

```text
Leia e siga estritamente estes arquivos antes de qualquer ação:
- AGENTS.md
- .cursor/rules/00-core.mdc
- .cursor/rules/01-architecture.mdc
- .cursor/rules/02-frontend.mdc
- .cursor/rules/04-validation.mdc
- .cursor/rules/05-task-boundaries.mdc
- docs/execution/02-definition-of-done-and-validation.md
- docs/prd/00-product-prd.md
- docs/context/02-conventions.md
- docs/context/03-current-architecture.md
- docs/backlog/cards/PRD1-001-project-management-ui.md
- todos os arquivos obrigatórios listados dentro do card
- os artefatos criados em F2-001

Agora execute apenas este card:
- docs/backlog/cards/PRD1-001-project-management-ui.md

Regras obrigatórias:
- Não expanda escopo.
- Não implemente editor completo.
- Não mexa em build/export/deploy.
- Preserve o layout atual como base.
- Crie apenas a listagem de projetos e a shell do editor por projeto.
- Se houver dúvida factual, escreva: "Assunção / validar no código".

Validações obrigatórias:
- npm run lint
- npm run build

Formato obrigatório de saída:
1. Card executado
2. Resumo do que foi feito
3. Arquivos alterados
4. Validações executadas
5. Limitações / assunções
6. Próximos riscos / dependências
```
