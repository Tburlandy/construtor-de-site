# F3-002 — Scope Studio save/load by project

## Objetivo
Adaptar o fluxo central do Studio para carregar e salvar conteúdo do projeto selecionado.

## Contexto
O Studio atual lê e grava um único conteúdo global. O PRD exige edição por projeto.

## Por que essa task existe
Sem isso, a gestão multi-projeto existe só nominalmente.

## Arquivos que devem ser lidos antes
- `src/pages/Studio.tsx`
- `studio-server.ts`
- `vite-plugin-studio.ts`
- `F3-001`

## Arquivos que podem ser alterados
- `src/pages/Studio.tsx`
- `studio-server.ts`
- `vite-plugin-studio.ts`
- módulos mínimos de integração de conteúdo por projeto

## Arquivos que não devem ser alterados
- build/export
- deploy
- SEO artifacts

## Escopo do que entra
- save/load do Studio por projeto
- seleção explícita do projeto no fluxo do editor
- manutenção de validação por schema

## Non-goals / o que não entra
- refazer toda a UI do Studio
- upload por projeto
- build por projeto
- histórico/versionamento

## Passos sugeridos
1. adaptar endpoints existentes para escopo de projeto
2. adaptar a tela do Studio para operar com projeto atual
3. preservar validação com Zod
4. manter o card pequeno

## Critérios de aceite
- Studio carrega conteúdo do projeto selecionado
- Studio salva conteúdo do projeto selecionado
- conteúdo de um projeto não sobrescreve outro

## Validações obrigatórias
```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos
- tentar redesenhar Studio inteiro
- quebrar fluxo de upload existente por tocar demais na tela

## Dependências
- F3-001

## Definição de pronto

Pronto quando a edição de conteúdo principal já estiver escopada por projeto.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- como save/load foi adaptado;
- arquivos alterados;
- validações executadas;
- limitações;
- riscos ainda abertos.
