# F3-003 — Scope media storage by project

## Objetivo

Isolar o armazenamento e o referenciamento de mídia por projeto.

## Contexto

Hoje as mídias ficam em caminhos globais. O PRD exige que múltiplos projetos sejam administrados sem colisão.

## Por que essa task existe

Sem isolamento de mídia, projetos podem sobrescrever ou misturar assets.

## Arquivos que devem ser lidos antes

- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `src/pages/Studio.tsx`
- `studio-server.ts`
- `vite-plugin-studio.ts`
- `F3-002`

## Arquivos que podem ser alterados

- `studio-server.ts`
- `vite-plugin-studio.ts`
- partes mínimas do Studio ligadas a upload
- utilitários mínimos de path se necessários

## Arquivos que não devem ser alterados

- `src/App.tsx`
- build/export
- deploy

## Escopo do que entra

- caminho de mídia por projeto
- upload de imagem por projeto
- upload de vídeo por projeto, se o fluxo atual o usar
- retorno de URL coerente com o novo caminho

## Non-goals / o que não entra

- redesign do uploader
- compressão avançada nova
- CDN
- publicação remota

## Passos sugeridos

1. definir layout de mídia por projeto com base na ADR
2. adaptar endpoints de upload
3. adaptar consumo mínimo no Studio
4. validar URLs resultantes

## Critérios de aceite

- uploads de um projeto não colidem com os de outro
- Studio consegue continuar usando as mídias carregadas
- a mudança é localizada

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos

- quebrar paths de imagens já existentes
- esquecer compatibilidade com base path no build

## Dependências

F3-002

## Definição de pronto

Pronto quando o armazenamento de mídia estiver isolado por projeto no fluxo novo.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- layout de mídia adotado;
- arquivos alterados;
- validações executadas;
- limitações;
- impactos futuros em build/export.
