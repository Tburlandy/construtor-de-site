# F3-004 — Add project SEO configuration persistence

## Objetivo

Persistir a configuração de SEO por projeto de forma explícita, separada do conteúdo global único.

## Contexto

O PRD exige SEO por projeto e por página/site. O projeto atual concentra SEO dentro do conteúdo único.

## Por que essa task existe

Prepara a geração futura de build e artefatos de SEO por projeto.

## Arquivos que devem ser lidos antes

- `src/content/schema.ts`
- `src/seo/SEO.tsx`
- repositório de conteúdo/projeto criado nas fases anteriores

## Arquivos que podem ser alterados

- contratos/schemas necessários
- persistência de conteúdo/projeto
- partes mínimas da UI shell ou Studio para refletir SEO do projeto

## Arquivos que não devem ser alterados

- build/export
- `public/robots.txt`
- `public/sitemap.xml`

## Escopo do que entra

- explicitar SEO por projeto na persistência
- garantir leitura/escrita coerente
- preparar terreno para geração futura

## Non-goals / o que não entra

- gerar robots/sitemap
- revisar o componente SEO inteiro
- implementar SEO por múltiplas páginas complexas além do card

## Passos sugeridos

1. revisar contrato atual de SEO
2. garantir que o SEO esteja ligado ao projeto correto
3. ajustar save/load se necessário
4. não gerar artefatos ainda

## Critérios de aceite

- cada projeto possui configuração SEO própria persistida
- a solução é compatível com F4
- não houve geração de artefatos ainda

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Riscos

- misturar persistência com geração de artefatos
- acoplar demais SEO ao fluxo antigo

## Dependências

F3-001

## Definição de pronto

Pronto quando SEO por projeto existir como dado persistido e utilizável.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- como o SEO ficou persistido;
- arquivos alterados;
- validações executadas;
- limitações;
- como isso destrava F4.
