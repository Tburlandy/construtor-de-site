# F8-005 — Render live project preview pane

## Objetivo

Entregar preview visual contínuo do projeto ativo dentro do builder, mantendo a página visível enquanto o operador edita.

## Contexto

O preview é o elemento protagonista da UX do construtor. Sem ele, a experiência continua centrada em formulário.

## Por que essa task existe

O operador precisa editar a página vendo a página, com atualização imediata ou rápida após salvar.

## Arquivos que devem ser lidos antes

- AGENTS.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- docs/backlog/cards/F8-001-create-builder-workspace-shell.md
- docs/backlog/cards/F8-004-implement-contextual-section-editor-panels.md
- src/pages/StudioProjectShell.tsx
- src/lib/content.ts
- src/pages/Index.tsx
- componentes de página usados no preview

## Arquivos que podem ser alterados

- src/pages/StudioProjectShell.tsx
- novos componentes em src/components/studio-builder/preview/
- src/lib/content.ts (apenas se estritamente necessário para escopo por projeto no preview)
- src/App.tsx (somente se uma rota de preview dedicada for necessária)

## Arquivos que não devem ser alterados

- arquitetura de persistência
- fluxo de build/export/deploy

## Escopo do que entra

- preview central sempre visível
- renderização do projeto ativo no preview
- sincronização por atualização imediata quando viável
- fallback aceito: refresh rápido após salvar seção
- estados de loading/erro do preview

## Non-goals / o que não entra

- engine de renderização livre tipo page builder completo
- pixel-perfect editor em canvas
- mudança estrutural ampla das páginas públicas

## Passos sugeridos

1. definir estratégia de preview com menor blast radius
2. implementar painel de preview no builder
3. conectar preview ao projeto ativo
4. sincronizar atualização de forma contínua ou pós-save rápido

## Critérios de aceite

- preview da página fica visível enquanto o usuário edita
- trocar projeto atualiza o preview para o novo projeto
- editar e salvar seção reflete no preview sem navegação confusa
- falhas do preview são exibidas com fallback claro

## Validações obrigatórias

```bash
npm run lint
npm run build
```

Executar também se houver alteração de tipos/node/server/build:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Riscos

- tentar resolver preview com refactor amplo de todas as páginas
- inconsistência entre estado de edição e conteúdo exibido

## Dependências

- F8-001
- F8-004
- F3-001

## Definição de pronto

Pronto quando o preview estiver integrado ao fluxo de edição por projeto e atualizado com latência aceitável.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
