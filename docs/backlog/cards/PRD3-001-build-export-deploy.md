# PRD3-001 — Build, export and deploy

## Objetivo

Transformar o build em fluxo operacional por projeto, incluindo parametrização de build, geração de artefatos SEO, exportação ZIP e deploy remoto com teste de conexão e log básico.

## Contexto

Depois que conteúdo, mídia e SEO já operam por projeto, é necessário gerar e publicar artefatos reais por projeto.

## Por que essa task existe

Sem isso, a plataforma ainda não entrega exportação e publicação, que são parte central do PRD.

## Arquivos que devem ser lidos antes

- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/backlog/cards/F4-001-externalize-build-config-per-project.md`
- `docs/backlog/cards/F4-002-generate-project-scoped-seo-artifacts.md`
- `docs/backlog/cards/F4-003-add-zip-export-flow.md`
- `docs/backlog/cards/F5-001-add-deploy-target-model.md`
- `docs/backlog/cards/F5-002-add-ftp-sftp-connection-test.md`
- `docs/backlog/cards/F5-003-add-publish-service-and-logs.md`
- `vite.config.ts`
- `src/App.tsx`
- `src/seo/SEO.tsx`
- `public/robots.txt`
- `public/sitemap.xml`
- `package.json`
- `studio-server.ts`
- `vite-plugin-studio.ts`

## Arquivos que podem ser alterados

- `vite.config.ts`
- `src/App.tsx`
- `src/seo/SEO.tsx`
- fluxo de build/geração de artefatos
- tooling mínimo de exportação ZIP
- módulos server-side de destino, teste de conexão e publicação
- UI mínima necessária para exportação/publicação, se estritamente necessária

## Arquivos que não devem ser alterados

- Studio amplo além do necessário
- histórico/versionamento
- admin embarcado

## Escopo do que entra

- parametrização de build por projeto
- remoção controlada de hardcodes críticos de base/build
- geração de `robots.txt` por projeto
- geração de `sitemap.xml` por projeto
- exportação ZIP por projeto
- modelo de destino de deploy
- teste de conexão FTP/SFTP
- publicação mínima com log básico

## Non-goals / o que não entra

- rollback
- histórico completo de publicações
- diff inteligente de diretórios
- múltiplos provedores sofisticados
- admin embarcado

## Passos sugeridos

1. parametrizar build por projeto
2. gerar artefatos SEO por projeto
3. implementar fluxo de ZIP por projeto
4. persistir destino de deploy
5. implementar teste de conexão
6. implementar publicação mínima com log

## Critérios de aceite

- build deixa de depender exclusivamente do cenário fixo atual
- cada projeto pode gerar artefatos SEO coerentes
- é possível exportar ZIP por projeto
- é possível configurar destino de deploy
- é possível testar conexão
- é possível publicar com log básico

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos

- quebrar base path e assets
- gerar artefato inconsistente
- tratar erro de conexão/publicação de forma silenciosa
- acoplar exportação e deploy de forma confusa

## Dependências

- PRD2-001

## Definição de pronto

Pronto quando existir fluxo funcional de build por projeto, ZIP por projeto e publicação básica por projeto.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações;
- riscos remanescentes para operação/histórico.

## Prompt para colar no Cursor

```text
Leia e siga estritamente estes arquivos antes de qualquer ação:
- AGENTS.md
- .cursor/rules/00-core.mdc
- .cursor/rules/01-architecture.mdc
- .cursor/rules/03-content-seo-build.mdc
- .cursor/rules/04-validation.mdc
- .cursor/rules/05-task-boundaries.mdc
- docs/execution/02-definition-of-done-and-validation.md
- docs/prd/00-product-prd.md
- docs/context/03-current-architecture.md
- docs/context/04-mvp-persistence-and-artifact-layout-adr.md
- docs/backlog/cards/PRD3-001-build-export-deploy.md
- todos os arquivos obrigatórios listados dentro do card

Agora execute apenas este card:
- docs/backlog/cards/PRD3-001-build-export-deploy.md

Regras obrigatórias:
- Não expanda escopo.
- Não implemente histórico completo, rollback ou admin embarcado.
- Mantenha a solução operacional e pequena dentro do que o card pede.
- Preserve SEO e build como requisitos centrais.
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
