# F8-006 — Create and duplicate project within builder

## Objetivo

Permitir criação e duplicação de projetos diretamente na barra superior do builder, sem sair da experiência de edição.

## Contexto

Hoje criação/duplicação já existe na listagem e na shell, mas a UX-alvo exige essas ações no contexto principal do construtor.

## Por que essa task existe

Troca frequente entre clientes/unidades é parte operacional do builder e precisa ocorrer sem fricção de navegação.

## Arquivos que devem ser lidos antes

- AGENTS.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- docs/backlog/cards/F8-002-add-topbar-project-switcher-and-context-actions.md
- src/pages/StudioProjectShell.tsx
- src/pages/StudioProjectList.tsx
- src/platform/studio/projectsStudioApi.ts

## Arquivos que podem ser alterados

- src/pages/StudioProjectShell.tsx
- componentes do topo em src/components/studio-builder/
- cliente de API usado pelo builder

## Arquivos que não devem ser alterados

- contratos server-side de duplicação/criação sem necessidade real
- persistência de projetos/conteúdo

## Escopo do que entra

- ação "novo projeto" no topo do builder
- ação "duplicar projeto" no topo do builder
- modais/formulários mínimos para criação e duplicação
- após criar/duplicar, projeto vira ativo e builder é recarregado no novo contexto

## Non-goals / o que não entra

- novos campos de metadata fora do contrato atual
- workflow avançado de templates
- ajustes de publicação/exportação

## Passos sugeridos

1. portar/adaptar fluxos de create/duplicate já existentes
2. embutir os fluxos no topo do builder
3. garantir navegação imediata para projeto recém-criado/duplicado
4. manter mensagens de erro/sucesso claras

## Critérios de aceite

- usuário cria projeto sem sair do builder
- novo projeto vira projeto ativo após criação
- usuário duplica projeto sem sair do builder
- projeto duplicado vira ativo após duplicação

## Validações obrigatórias

```bash
npm run lint
npm run build
```

Executar também se houver alteração de tipos/node/server:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Riscos

- duplicar lógica de formulário sem reaproveitamento
- erro de navegação após create/duplicate

## Dependências

- F8-002
- F6-002
- F2-001

## Definição de pronto

Pronto quando criação e duplicação estiverem operacionais dentro do topo do builder.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
