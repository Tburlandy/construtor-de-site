# F4-002 — Generate project-scoped SEO artifacts

## Objetivo

Gerar artefatos de SEO por projeto, especialmente `robots.txt` e `sitemap.xml`, alinhados ao domínio/configuração do projeto.

## Contexto

Hoje esses arquivos estão em `public/` e funcionam como artefatos globais fixos.

## Por que essa task existe

O PRD exige SEO por projeto e build estático correto para cada entrega.

## Arquivos que devem ser lidos antes

- `public/robots.txt`
- `public/sitemap.xml`
- `src/seo/SEO.tsx`
- `F4-001`

## Arquivos que podem ser alterados

- fluxo de build/geração de artefatos
- arquivos de template ou geração relacionados
- módulos mínimos necessários para composição dos artefatos

## Arquivos que não devem ser alterados

- Studio UI ampla
- deploy remoto
- histórico de publicação

## Escopo do que entra

- gerar `robots.txt` por projeto
- gerar `sitemap.xml` por projeto
- garantir coerência com domínio/base do projeto

## Non-goals / o que não entra

- exportação ZIP
- publicação remota
- SEO multi-página avançado além do necessário para o PRD/MVP

## Passos sugeridos

1. identificar como os artefatos serão montados
2. introduzir geração por projeto
3. validar saída do build
4. não misturar ainda com ZIP/deploy

## Critérios de aceite

- artefatos de SEO deixam de ser apenas placeholders globais
- a geração considera o projeto atual
- o build permanece funcional

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- gerar arquivos inconsistentes com o build real
- quebrar fluxo existente por tratar public/ como fonte única

## Dependências

F4-001

## Definição de pronto

Pronto quando o build do projeto já produzir artefatos básicos de SEO coerentes com o projeto.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- artefatos gerados e como;
- arquivos alterados;
- validações executadas;
- limitações;
- impactos em exportação.
