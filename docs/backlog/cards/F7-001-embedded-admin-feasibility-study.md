# F7-001 — Embedded admin feasibility study

## Objetivo

Fazer um estudo técnico curto e objetivo sobre a viabilidade do admin embarcado no site publicado, sem implementar o recurso.

## Contexto

O PRD cita a possibilidade futura de um admin no site do cliente, semelhante em efeito operacional ao WordPress, mas preservando build estático e SEO.

## Por que essa task existe

Esse item é de alto risco e não deve ser implementado por impulso.

## Arquivos que devem ser lidos antes

- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `docs/execution/03-risks-and-guardrails.md`

## Arquivos que podem ser alterados

- documento novo curto de estudo em `docs/context/` ou `docs/execution/`
- backlog, se a conclusão exigir replanejamento explícito

## Arquivos que não devem ser alterados

- código do produto

## Escopo do que entra

- estudo de viabilidade
- opções realistas
- trade-offs
- recomendação objetiva: seguir, adiar ou descartar no MVP

## Non-goals / o que não entra

- implementar admin embarcado
- adicionar autenticação
- adicionar PHP ou backend novo
- mudar build

## Passos sugeridos

1. revisar riscos centrais
2. listar opções reais compatíveis com hospedagem compartilhada
3. avaliar impacto em SEO, persistência e segurança
4. emitir recomendação clara

## Critérios de aceite

- existe um parecer curto e útil
- o parecer não é genérico
- a recomendação final é explícita

## Validações obrigatórias

- revisão manual do documento

## Riscos

- transformar o estudo em design detalhado sem necessidade
- propor solução fantasiosa incompatível com o projeto real

## Dependências

F6-001

## Definição de pronto

Pronto quando existir uma recomendação objetiva e utilizável sobre o admin embarcado, sem implementação.

## Instrução final de entrega para o agente

Ao concluir, responda com:

1. recomendação final;
2. documento criado/alterado;
3. trade-offs;
4. limitações;
5. impacto no roadmap.
