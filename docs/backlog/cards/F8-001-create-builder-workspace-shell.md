# F8-001 — Create builder workspace shell

## Objetivo

Transformar a tela de editor por projeto em um shell de builder visual com três áreas fixas: topo, menu lateral e preview.

## Contexto

`StudioProjectShell` hoje funciona como página de status/shell textual. É necessário criar o contêiner visual do construtor antes de migrar navegação e edição por seção.

## Por que essa task existe

Sem o shell macro, os próximos cards não têm superfície consistente para switch de projeto, painel contextual e preview contínuo.

## Arquivos que devem ser lidos antes

- `AGENTS.md`
- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/backlog/cards/PRD5-001-visual-builder-experience.md`
- `src/pages/StudioProjectShell.tsx`
- `src/pages/Studio.tsx`
- `src/components/ui/sidebar.tsx` (se aplicável)

## Arquivos que podem ser alterados

- `src/pages/StudioProjectShell.tsx`
- novos componentes em `src/components/studio-builder/`
- estilos utilitários mínimos usados pela shell

## Arquivos que não devem ser alterados

- `studio-server.ts`
- `vite.config.ts`
- persistência de conteúdo/projeto

## Escopo do que entra

- layout macro do builder com topo fixo
- coluna lateral esquerda para navegação/edição
- área principal para preview
- responsividade mínima (desktop e mobile)
- manutenção do carregamento do projeto atual

## Non-goals / o que não entra

- switch de projeto funcional no topo
- preview real do site
- migração dos formulários de seção
- criação/duplicação por topo

## Passos sugeridos

1. criar estrutura visual base do builder no `StudioProjectShell`
2. extrair componentes pequenos para manter legibilidade
3. preservar estados de loading/notFound/erros já existentes
4. preparar slots claros para os cards seguintes

## Critérios de aceite

- a rota `/dev/studio/projects/:projectId` abre em layout builder de 3 áreas
- topo, lateral e preview ficam visíveis no desktop
- em mobile o layout continua utilizável sem quebrar a navegação
- estados de loading/not found continuam funcionando

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- iniciar redesign amplo em vez de shell incremental
- quebrar fluxo já existente de carregamento do projeto

## Dependências

- `F2-003-create-project-editor-shell.md`

## Definição de pronto

Pronto quando a estrutura visual do builder estiver estável e pronta para receber switch, seções e preview real.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
