# F5-001 — Add deploy target model

## Objetivo

Criar o modelo mínimo de destino de publicação para suportar deploy em hospedagem compartilhada.

## Contexto

O PRD exige publicação direta via FTP/SFTP. Antes da conexão e do publish, é preciso persistir o destino.

## Por que essa task existe

Sem modelo de destino, não há como testar conexão nem publicar com rastreabilidade.

## Arquivos que devem ser lidos antes

- `docs/prd/00-product-prd.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `F1-001`
- `F1-002`
- `F4-003`

## Arquivos que podem ser alterados

- contratos do domínio
- persistência de projeto/destino
- UI shell mínima, se o card precisar capturar dados básicos

## Arquivos que não devem ser alterados

- mecanismo de publicação remota
- build core
- Studio

## Escopo do que entra

- contrato de destino de deploy
- persistência mínima do destino
- campos necessários para FTP/SFTP
- estratégia explícita para credenciais sensíveis no escopo possível do projeto

## Non-goals / o que não entra

- testar conexão
- publicar
- histórico completo

## Passos sugeridos

1. definir contrato mínimo do destino
2. persistir destino por projeto
3. registrar limitações de segurança se houver
4. não implementar ainda o teste de conexão

## Critérios de aceite

- projeto pode ter destino de deploy persistido
- contrato é compatível com FTP/SFTP
- limites de segurança estão explícitos

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Riscos

- tratar credencial sensível de forma descuidada
- misturar modelo de destino com lógica de publicação

## Dependências

F4-003

## Definição de pronto

Pronto quando o sistema puder armazenar destino de deploy por projeto de forma explícita.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- contrato de destino implementado;
- arquivos alterados;
- validações executadas;
- limitações;
- como isso destrava F5-002.
