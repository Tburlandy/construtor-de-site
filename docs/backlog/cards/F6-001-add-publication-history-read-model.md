# F6-001 — Add publication history read model

## Objetivo

Adicionar leitura mínima de histórico de publicações para dar rastreabilidade operacional.

## Contexto

Após publicar, o operador precisa saber quando, para onde e com qual resultado.

## Por que essa task existe

Sem histórico, a operação fica opaca e difícil de auditar.

## Arquivos que devem ser lidos antes

- artefatos de `F5-003`
- `docs/prd/00-product-prd.md`
- `docs/execution/03-risks-and-guardrails.md`

## Arquivos que podem ser alterados

- contratos de publicação
- persistência/leitura de registros
- UI mínima de histórico, se couber no card

## Arquivos que não devem ser alterados

- build core
- deploy core
- Studio

## Escopo do que entra

- modelo de leitura do histórico
- listagem mínima de publicações realizadas
- dados básicos: projeto, horário, status, destino

## Non-goals / o que não entra

- rollback
- comparação de versões
- auditoria avançada

## Passos sugeridos

1. identificar dados já gerados em F5
2. persistir ou estruturar leitura dos registros
3. expor leitura mínima
4. manter o card pequeno

## Critérios de aceite

- histórico mínimo pode ser consultado
- dados básicos são visíveis
- não há redesign de observabilidade

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- tentar resolver versionamento completo
- acoplar histórico à UI demais

## Dependências

F5-003

## Definição de pronto

Pronto quando a operação tiver um read model básico das publicações.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- o que passou a ser registrado/consultado;
- arquivos alterados;
- validações executadas;
- limitações;
- o que ainda falta para versionamento avançado.
