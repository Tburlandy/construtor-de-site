# F8-007 — Sync preview section focus with sidebar

## Objetivo

Sincronizar a seção ativa do menu lateral com feedback visual no preview, incluindo navegação rápida entre blocos.

## Contexto

Após o builder estar funcional, falta melhorar a percepção visual de contexto entre "o que estou editando" e "onde isso aparece na página".

## Por que essa task existe

Esse refinamento aproxima a experiência do padrão esperado de builder visual sem exigir drag-and-drop completo.

## Arquivos que devem ser lidos antes

- AGENTS.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- docs/backlog/cards/F8-003-add-builder-sections-sidebar-navigation.md
- docs/backlog/cards/F8-005-render-live-project-preview-pane.md
- src/pages/StudioProjectShell.tsx
- componentes de preview do builder

## Arquivos que podem ser alterados

- src/pages/StudioProjectShell.tsx
- componentes em src/components/studio-builder/preview/
- mapeamento seção -> elemento do preview

## Arquivos que não devem ser alterados

- contratos de domínio
- persistência
- build/export/deploy

## Escopo do que entra

- destaque visual da seção ativa no preview
- sincronização lateral -> preview
- opcional suportado: clique no preview para ativar seção na lateral
- scroll suave ou foco visual mínimo para seção selecionada

## Non-goals / o que não entra

- overlay complexo estilo Elementor completo
- edição estrutural por arrastar blocos
- reescrita total dos componentes da página pública

## Passos sugeridos

1. definir estratégia de marcação das seções no preview
2. aplicar destaque visual não intrusivo
3. sincronizar seleção da lateral com foco no preview
4. validar fluxo em desktop e mobile

## Critérios de aceite

- seção selecionada no menu lateral é destacada no preview
- usuário entende rapidamente qual bloco está editando
- comportamento não quebra renderização da página
- fallback claro quando seção não tem âncora mapeada

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- acoplamento frágil entre ids de seção e estrutura visual
- regressão visual em componentes existentes

## Dependências

- F8-003
- F8-005

## Definição de pronto

Pronto quando o foco de seção estiver sincronizado de forma estável entre lateral e preview.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
