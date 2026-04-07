# PRD5-001 — Visual builder experience

## Objetivo

Consolidar a UX principal do Studio como um construtor visual multi-projeto, com switch de projeto no topo, preview central contínuo e edição contextual por seção no menu lateral.

## Contexto

A base multi-projeto já existe em persistência e casca de UI/API, mas a experiência de edição ainda é percebida como painel técnico. Este card organiza a execução da camada de UX que falta para o fluxo de builder.

## Por que essa task existe

Sem essa camada, o operador continua editando dados em telas técnicas separadas em vez de construir a página vendo a página.

## Arquivos que devem ser lidos antes

- `AGENTS.md`
- `docs/prd/00-product-prd.md`
- `docs/execution/00-master-execution-guide.md`
- `docs/execution/02-definition-of-done-and-validation.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `src/pages/Studio.tsx`
- `src/pages/StudioProjectShell.tsx`
- `src/pages/StudioProjectList.tsx`
- `src/platform/studio/projectsStudioApi.ts`
- todos os cards `F8-*` deste pacote

## Arquivos que podem ser alterados

- `src/pages/StudioProjectShell.tsx`
- novos componentes em `src/components/studio-builder/`
- `src/pages/Studio.tsx` somente para reaproveitamento incremental
- `src/lib/content.ts` somente quando necessário para preview por projeto
- `src/App.tsx` apenas se rota adicional de preview for necessária

## Arquivos que não devem ser alterados

- `docs/prd/00-product-prd.md`
- `vite.config.ts`
- arquitetura de persistência definida na ADR
- stack e estrutura macro do repositório

## Escopo do que entra

- topo fixo com troca de projeto e ações globais do builder
- menu lateral com seções editáveis e painel contextual
- preview principal sempre visível
- criação e duplicação de projeto sem sair do builder
- sincronização básica entre seção ativa e preview

## Non-goals / o que não entra

- drag-and-drop completo estilo Elementor
- editor visual livre/pixel-perfect
- redesign amplo da arquitetura do produto
- mudanças em build/export/deploy fora da superfície de UX

## Passos sugeridos

1. executar `F8-001` até `F8-007` em ordem
2. manter cada card pequeno e verificável
3. evitar refactor amplo sem necessidade do card corrente
4. reportar explicitamente gaps e riscos remanescentes

## Critérios de aceite

- o operador troca projeto no topo sem sair da lógica do builder
- o preview permanece visível durante a edição
- o menu lateral lista seções e mostra campos da seção selecionada
- o fluxo geral é percebido como construtor visual e não como admin técnico
- criação/duplicação de projeto pode ser feita dentro do builder

## Validações obrigatórias

```bash
npm run lint
npm run build
```

Executar também quando houver alteração em tipos/node/server/build:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Riscos

- tentar migrar tudo de uma vez e ampliar blast radius
- misturar refactor estrutural com ajuste de UX
- acoplar cedo demais o domínio da plataforma em `src/content/schema.ts`

## Dependências

- `PRD2-001-project-content-media-seo.md`
- `F6-002-add-duplicate-project-action.md`

## Definição de pronto

Pronto quando os cards `F8-*` desta trilha estiverem concluídos com validações executadas e com experiência de builder visual funcional.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.

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
- docs/context/03-current-architecture.md
- docs/context/04-mvp-persistence-and-artifact-layout-adr.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- todos os arquivos obrigatórios listados dentro do card e do F8 correspondente

Agora execute apenas o card F8 explicitamente solicitado nesta conversa.

Regras obrigatórias:
- Não expanda escopo.
- Não implemente drag-and-drop completo.
- Não reescreva o Studio inteiro.
- Preserve arquitetura, persistência e fluxo multi-projeto já definidos.
- Se houver dúvida factual, escreva: "Assunção / validar no código".

Formato obrigatório de saída:
1. Card executado
2. Resumo do que foi feito
3. Arquivos alterados
4. Validações executadas
5. Limitações / assunções
6. Próximos riscos / dependências
```
