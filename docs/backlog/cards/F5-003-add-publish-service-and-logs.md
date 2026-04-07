# F5-003 — Add publish service and logs

## Objetivo

Adicionar o fluxo mínimo de publicação remota do build do projeto com logging operacional.

## Contexto

Após ZIP e teste de conexão, o PRD exige publicação direta em hospedagem compartilhada.

## Por que essa task existe

É o fechamento da proposta operacional do MVP.

## Arquivos que devem ser lidos antes

- `F4-003`
- `F5-001`
- `F5-002`
- regras de validação
- riscos e guardrails

## Arquivos que podem ser alterados

- módulos server-side de publicação
- endpoint/ação mínima de publish
- contratos mínimos de log/publicação
- UI mínima para acionar publicação, se necessário

## Arquivos que não devem ser alterados

- Studio amplo
- admin embarcado
- refactors paralelos

## Escopo do que entra

- publicação mínima do artefato do projeto
- log operacional básico
- distinção clara entre teste de conexão e publish

## Non-goals / o que não entra

- rollback
- diff inteligente de arquivos
- múltiplos provedores sofisticados
- fila/worker distribuído

## Passos sugeridos

1. ligar artefato exportado ao serviço de publicação
2. implementar upload/publicação mínima
3. registrar logs e estados
4. não tentar resolver histórico completo aqui

## Critérios de aceite

- é possível acionar publicação de um projeto
- existe log básico do resultado
- falhas são reportadas de forma clara

## Validações obrigatórias

```bash
npm run lint
npm run build
```

E:

- registrar limitações do teste local

## Riscos

- publicar artefato inconsistente
- tratar falhas silenciosamente
- misturar histórico completo no mesmo card

## Dependências

F5-002

## Definição de pronto

Pronto quando houver um fluxo mínimo de publish acionável com logging básico.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- fluxo de publish implementado;
- arquivos alterados;
- validações executadas;
- limitações;
- o que ficou para F6.
