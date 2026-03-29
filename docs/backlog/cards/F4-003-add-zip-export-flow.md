# F4-003 — Add ZIP export flow

## Objetivo

Adicionar o fluxo operacional de exportação ZIP do artefato gerado por projeto.

## Contexto

O PRD exige download do build em `.zip`. O projeto atual possui um `dist.zip` no repositório, mas não um fluxo operacional confiável na interface.

## Por que essa task existe

ZIP é um dos entregáveis centrais do MVP.

## Arquivos que devem ser lidos antes

- `package.json`
- `vite.config.ts`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- artefatos de build de F4-001/F4-002
- telas shells criadas em F2

## Arquivos que podem ser alterados

- tooling mínimo de exportação
- endpoints ou handlers mínimos relacionados
- UI mínima para disparar exportação/download
- documentação de comando se necessário

## Arquivos que não devem ser alterados

- deploy remoto
- histórico/versionamento
- admin embarcado

## Escopo do que entra

- gerar ZIP por projeto
- expor ação operacional mínima para exportar
- manter naming e localização previsíveis
- alinhar saída ao diretório de artefatos definido na ADR

## Non-goals / o que não entra

- publicação por FTP/SFTP
- rollback
- múltiplos perfis de exportação

## Passos sugeridos

1. definir fluxo mínimo de geração do artefato final
2. compactar o build do projeto
3. expor ação mínima na UI ou API
4. validar o resultado

## Critérios de aceite

- é possível gerar ZIP por projeto
- o fluxo é operacionalmente utilizável
- não depende de procedimento manual obscuro

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- compactar build errado
- acoplar exportação ao deploy antes da hora

## Dependências

- F4-001
- F4-002

## Definição de pronto

Pronto quando houver um fluxo claro para baixar o build ZIP de um projeto.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- fluxo de exportação implementado;
- arquivos alterados;
- validações executadas;
- limitações;
- o que falta para deploy.
