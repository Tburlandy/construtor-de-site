# F8-003 — Add builder sections sidebar navigation

## Objetivo

Criar o menu lateral do builder com navegação por seções editáveis da página.

## Contexto

Com shell e topo prontos, o operador precisa navegar por blocos da página sem usar abas técnicas genéricas.

## Por que essa task existe

A lista lateral de seções é um dos elementos centrais da sensação de construtor visual.

## Arquivos que devem ser lidos antes

- AGENTS.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- docs/backlog/cards/F8-001-create-builder-workspace-shell.md
- docs/backlog/cards/F8-002-add-topbar-project-switcher-and-context-actions.md
- src/pages/StudioProjectShell.tsx
- src/pages/Studio.tsx
- src/content/schema.ts

## Arquivos que podem ser alterados

- src/pages/StudioProjectShell.tsx
- novos componentes em src/components/studio-builder/
- constantes auxiliares do builder (ex: registro de seções)

## Arquivos que não devem ser alterados

- schema central do conteúdo, salvo necessidade estrita
- repositórios de persistência

## Escopo do que entra

- menu lateral com lista ordenada de seções
- estado de seção ativa
- visual de seção ativa e navegação rápida
- separação entre navegação e painel de campos
- seção "Mídia" e outras entradas não cobertas podem aparecer como placeholder explícito

## Non-goals / o que não entra

- formulário completo de cada seção
- destaque no preview por seção
- clique no preview para navegar

## Passos sugeridos

1. definir registro de seções suportadas no builder
2. renderizar navegação lateral baseada nesse registro
3. controlar seleção da seção ativa
4. preparar slot de editor contextual da seção

## Critérios de aceite

- lateral lista seções editáveis em ordem estável
- usuário seleciona seção e o estado ativo muda
- o painel contextual recebe a seção selecionada
- preview permanece visível enquanto navega nas seções

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- acoplamento rígido entre menu e formulário
- incluir seções sem estado claro de suporte

## Dependências

- F8-001
- F8-002

## Definição de pronto

Pronto quando a navegação lateral por seções estiver funcional e conectada ao painel contextual.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
