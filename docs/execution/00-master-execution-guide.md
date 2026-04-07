# Master Execution Guide

## O que é este arquivo

Este é o documento principal de execução.
Ele mostra como usar os outros documentos sem perder contexto no Cursor/Codex.

## Fonte de verdade

- Produto e escopo: `docs/prd/00-product-prd.md`
- Arquitetura atual: `docs/context/03-current-architecture.md`
- Decisão estrutural inicial: `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`

## Ordem de precedência

Se houver conflito:
1. PRD
2. ADR estrutural inicial
3. cards do backlog
4. AGENTS.md
5. rules do Cursor

## Ordem recomendada de leitura

### Antes de começar qualquer execução
1. `docs/prd/00-product-prd.md`
2. `docs/context/03-current-architecture.md`
3. `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
4. `docs/context/01-stack-and-commands.md`
5. `docs/context/02-conventions.md`
6. `AGENTS.md`

### Antes de executar um card
1. o card atual
2. `docs/execution/02-definition-of-done-and-validation.md`
3. as rules aplicáveis em `.cursor/rules/`
4. os arquivos do código listados no card

## Como usar no Cursor/Codex

Sempre trabalhar assim:
1. abrir um chat novo para um card;
2. mandar o agente ler:
   - `AGENTS.md`
   - rules aplicáveis
   - `docs/execution/02-definition-of-done-and-validation.md`
   - o card atual
3. pedir para executar apenas aquele card;
4. pedir para não expandir escopo;
5. pedir o resumo final com:
   - arquivos alterados
   - validações executadas
   - limitações
   - próximos riscos

## Regra prática principal

O agente não deve repensar o produto.
O produto já está definido no PRD.
O agente deve apenas:
- ler o contexto necessário;
- executar o card;
- validar;
- relatar o que fez.

## Como decidir o próximo card

Seguir esta ordem:
1. dependência técnica
2. menor risco
3. menor tamanho executável
4. maior clareza

## Regra final

Nunca pedir “faz tudo de uma vez”.
Sempre usar um card por vez.
