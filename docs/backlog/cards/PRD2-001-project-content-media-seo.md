# PRD2-001 — Project content, media and SEO

## Objetivo

Migrar o núcleo funcional do sistema para operar por projeto, incluindo carregamento de conteúdo, save/load do Studio por projeto, mídia por projeto e persistência de SEO por projeto.

## Contexto

Depois da gestão multi-projeto existir em nível de interface, o próximo passo é fazer o fluxo central funcionar de verdade por projeto, sem depender apenas do conteúdo global único.

## Por que essa task existe

Essa é a transição real de single-site para multi-projeto no núcleo do sistema.

## Arquivos que devem ser lidos antes

- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/backlog/cards/F3-001-scope-content-loading-by-project.md`
- `docs/backlog/cards/F3-002-scope-studio-save-load-by-project.md`
- `docs/backlog/cards/F3-003-scope-media-storage-by-project.md`
- `docs/backlog/cards/F3-004-add-project-seo-configuration-persistence.md`
- `src/lib/content.ts`
- `src/content/schema.ts`
- `src/pages/Studio.tsx`
- `studio-server.ts`
- `vite-plugin-studio.ts`

## Arquivos que podem ser alterados

- `src/lib/content.ts`
- `src/content/schema.ts` apenas se estritamente necessário para interoperabilidade
- `src/pages/Studio.tsx`
- `studio-server.ts`
- `vite-plugin-studio.ts`
- módulos auxiliares mínimos de conteúdo/mídia/SEO por projeto

## Arquivos que não devem ser alterados

- `vite.config.ts`
- build/export/deploy
- UI ampla fora do fluxo de Studio e editor de projeto

## Escopo do que entra

- leitura de conteúdo por projeto
- save/load do Studio por projeto
- seleção explícita do projeto no fluxo de edição
- upload de imagem por projeto
- upload de vídeo por projeto, se aplicável
- paths de mídia por projeto
- persistência de SEO por projeto

## Non-goals / o que não entra

- geração de robots/sitemap
- build por projeto
- ZIP
- deploy remoto
- histórico/versionamento

## Passos sugeridos

1. adaptar o carregamento de conteúdo para escopo de projeto
2. adaptar o Studio para load/save por projeto
3. isolar a mídia por projeto
4. persistir configuração de SEO por projeto
5. manter compatibilidade de transição com o fluxo atual

## Critérios de aceite

- o editor consegue resolver conteúdo do projeto selecionado
- o Studio carrega e salva por projeto
- uploads de mídia não colidem entre projetos
- cada projeto possui SEO próprio persistido
- o fluxo antigo não é quebrado indevidamente

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos

- quebrar o fluxo atual de renderização
- acoplar cedo demais transição legado/novo
- quebrar paths de assets
- misturar persistência de SEO com geração de artefatos

## Dependências

- PRD1-001

## Definição de pronto

Pronto quando o núcleo de conteúdo, mídia e SEO já estiver operando por projeto no fluxo novo.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações;
- riscos remanescentes para build/export.

## Prompt para colar no Cursor

```text
Leia e siga estritamente estes arquivos antes de qualquer ação:
- AGENTS.md
- .cursor/rules/00-core.mdc
- .cursor/rules/01-architecture.mdc
- .cursor/rules/02-frontend.mdc
- .cursor/rules/03-content-seo-build.mdc
- .cursor/rules/04-validation.mdc
- .cursor/rules/05-task-boundaries.mdc
- docs/execution/02-definition-of-done-and-validation.md
- docs/prd/00-product-prd.md
- docs/context/03-current-architecture.md
- docs/context/04-mvp-persistence-and-artifact-layout-adr.md
- docs/backlog/cards/PRD2-001-project-content-media-seo.md
- todos os arquivos obrigatórios listados dentro do card

Agora execute apenas este card:
- docs/backlog/cards/PRD2-001-project-content-media-seo.md

Regras obrigatórias:
- Não expanda escopo.
- Não implemente build, ZIP, deploy ou histórico.
- Não redesenhe o Studio inteiro além do necessário para operar por projeto.
- Preserve compatibilidade mínima com o fluxo atual.
- Se houver dúvida factual, escreva: "Assunção / validar no código".

Validações obrigatórias:
- npm run lint
- npx tsc --noEmit -p tsconfig.app.json
- npx tsc --noEmit -p tsconfig.node.json
- npm run build

Formato obrigatório de saída:
1. Card executado
2. Resumo do que foi feito
3. Arquivos alterados
4. Validações executadas
5. Limitações / assunções
6. Próximos riscos / dependências
```
