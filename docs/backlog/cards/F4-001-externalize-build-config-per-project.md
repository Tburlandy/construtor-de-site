# F4-001 — Externalize build config per project

## Objetivo

Preparar o build para aceitar configuração por projeto, especialmente base path, domínio e parâmetros centrais do artefato.

## Contexto

Hoje `vite.config.ts` e `src/App.tsx` carregam base fixa `/pagina`. O PRD exige build por projeto.

## Por que essa task existe

Sem parametrização mínima do build, ZIP e deploy continuarão presos ao site único.

## Arquivos que devem ser lidos antes

- `vite.config.ts`
- `src/App.tsx`
- `src/lib/content.ts`
- `F3-004`
- `docs/context/03-current-architecture.md`

## Arquivos que podem ser alterados

- `vite.config.ts`
- `src/App.tsx`
- módulos mínimos de configuração relacionados ao build por projeto

## Arquivos que não devem ser alterados

- `src/pages/Studio.tsx`
- endpoints de upload
- deploy remoto

## Escopo do que entra

- parametrização mínima de base/build por projeto
- remoção controlada de hardcodes críticos
- manter compatibilidade com o fluxo atual sempre que necessário

## Non-goals / o que não entra

- gerar ZIP
- publicar remotamente
- gerar histórico
- admin embarcado

## Passos sugeridos

1. mapear hardcodes críticos de base path
2. introduzir forma controlada de parametrização
3. validar build
4. documentar trade-offs de transição

## Critérios de aceite

- build deixa de depender exclusivamente de `/pagina`
- configuração por projeto passa a ser tecnicamente possível
- o app continua buildando

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos

- quebrar assets ou rotas
- mexer demais no roteamento

## Dependências

F3-004

## Definição de pronto

Pronto quando o build tiver parametrização mínima suficiente para suportar projeto específico.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- hardcodes removidos ou externalizados;
- arquivos alterados;
- validações executadas;
- limitações;
- riscos remanescentes para F4-002/F4-003.
