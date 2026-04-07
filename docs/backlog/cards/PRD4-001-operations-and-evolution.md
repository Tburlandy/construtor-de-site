# PRD4-001 — Operations and evolution

## Objetivo

Adicionar os recursos operacionais finais desta etapa: histórico básico de publicações, duplicação de projeto e estudo de viabilidade do admin embarcado.

## Contexto

Depois que a plataforma já cria, edita, exporta e publica projetos, o próximo passo é melhorar a operação e registrar a recomendação técnica sobre o admin embarcado.

## Por que essa task existe

Sem isso, a plataforma fica funcional, mas ainda com pouca rastreabilidade e sem fechamento claro sobre a evolução opcional mais sensível do PRD.

## Arquivos que devem ser lidos antes

- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/execution/03-risks-and-guardrails.md`
- `docs/backlog/cards/F6-001-add-publication-history-read-model.md`
- `docs/backlog/cards/F6-002-add-duplicate-project-action.md`
- `docs/backlog/cards/F7-001-embedded-admin-feasibility-study.md`
- artefatos de publicação criados anteriormente
- repositórios de projeto e conteúdo
- API shell de projetos
- tela de listagem de projetos

## Arquivos que podem ser alterados

- contratos de publicação
- persistência/leitura de registros
- repositório de projeto/conteúdo
- API shell de projetos
- UI mínima de histórico e duplicação, se necessária
- documento curto de estudo do admin embarcado

## Arquivos que não devem ser alterados

- build core
- deploy core
- Studio amplo
- arquitetura estrutural fora do escopo

## Escopo do que entra

- histórico básico de publicações
- leitura mínima de publicações realizadas
- ação de duplicar projeto
- duplicação de metadados e conteúdo necessário
- estudo curto e objetivo sobre admin embarcado

## Non-goals / o que não entra

- rollback
- comparação avançada de versões
- auditoria avançada
- implementação do admin embarcado
- adicionar backend novo só para o admin

## Passos sugeridos

1. estruturar leitura mínima do histórico de publicações
2. expor o histórico de forma operacional
3. implementar duplicação mínima de projeto
4. expor a duplicação na superfície operacional adequada
5. produzir parecer técnico curto sobre admin embarcado

## Critérios de aceite

- histórico básico de publicações pode ser consultado
- projeto pode ser duplicado com segurança
- clone não sobrescreve original
- existe recomendação explícita sobre o admin embarcado
- nada fora do escopo foi implementado

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos

- tentar resolver versionamento completo
- copiar dados demais na duplicação
- propor solução fantasiosa para admin embarcado

## Dependências

- PRD3-001

## Definição de pronto

Pronto quando a plataforma tiver rastreabilidade básica, duplicação operacional e parecer técnico sobre a evolução opcional do admin embarcado.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações;
- recomendação final sobre o admin embarcado.

## Prompt para colar no Cursor

```text
Leia e siga estritamente estes arquivos antes de qualquer ação:
- AGENTS.md
- .cursor/rules/00-core.mdc
- .cursor/rules/01-architecture.mdc
- .cursor/rules/04-validation.mdc
- .cursor/rules/05-task-boundaries.mdc
- docs/execution/02-definition-of-done-and-validation.md
- docs/prd/00-product-prd.md
- docs/context/03-current-architecture.md
- docs/context/04-mvp-persistence-and-artifact-layout-adr.md
- docs/backlog/cards/PRD4-001-operations-and-evolution.md
- todos os arquivos obrigatórios listados dentro do card

Agora execute apenas este card:
- docs/backlog/cards/PRD4-001-operations-and-evolution.md

Regras obrigatórias:
- Não expanda escopo.
- Não implemente admin embarcado completo.
- Mantenha duplicação e histórico no mínimo operacional descrito no card.
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
6. Recomendação sobre admin embarcado
```
