# F8-004 — Implement contextual section editor panels

## Objetivo

Migrar a edição para painéis contextuais por seção dentro do menu lateral do builder.

## Contexto

A navegação lateral sem os campos contextuais ainda mantém a experiência incompleta. O operador precisa selecionar seção e editar no mesmo contexto visual.

## Por que essa task existe

Sem editor contextual por seção, o produto continua parecendo formulário técnico genérico.

## Arquivos que devem ser lidos antes

- AGENTS.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- docs/backlog/cards/F8-003-add-builder-sections-sidebar-navigation.md
- src/pages/Studio.tsx
- src/pages/StudioProjectShell.tsx
- src/content/schema.ts

## Arquivos que podem ser alterados

- src/pages/StudioProjectShell.tsx
- componentes em src/components/studio-builder/editors/
- utilitários de estado local de edição

## Arquivos que não devem ser alterados

- contratos de domínio da plataforma
- endpoints server-side (salvo ajuste estritamente necessário)

## Escopo do que entra

- editor por seção no painel lateral
- migração incremental dos campos já existentes em Studio
- campos mínimos para: Global, SEO, Hero, Benefícios, Showcase, Mídia
- ações de salvar no contexto do builder
- UX que evite aparência de JSON editor puro

## Non-goals / o que não entra

- criar novos campos de domínio fora do schema atual
- drag-and-drop avançado para todos os blocos
- substituir integralmente todos os componentes antigos do Studio em um único passo

## Passos sugeridos

1. extrair/portar editores de seção do Studio atual
2. conectar seção ativa ao editor correspondente
3. manter estado de edição local e fluxo de salvar
4. preservar fallback seguro para seções ainda não migradas

## Critérios de aceite

- ao selecionar seção, os campos dessa seção aparecem no painel lateral
- o operador edita e salva sem sair do builder
- o painel não se comporta como editor de JSON bruto
- seções não migradas são sinalizadas explicitamente, sem quebrar o fluxo

## Validações obrigatórias

```bash
npm run lint
npm run build
```

Executar também se houver alteração de tipos:

```bash
npx tsc --noEmit -p tsconfig.app.json
```

## Riscos

- regressões em campos legados durante a migração
- card crescer demais por tentar cobrir todos os campos de uma vez

## Dependências

- F8-003
- F3-002

## Definição de pronto

Pronto quando a edição contextual por seção estiver funcional para o conjunto mínimo definido no escopo.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
