# F6-002 — Add duplicate project action

## Objetivo

Adicionar a ação de duplicar projeto para reaproveitamento operacional.

## Contexto

O PRD prevê produtividade na criação de novas páginas/unidades. Duplicação é uma aceleração natural.

## Por que essa task existe

Reduz retrabalho ao criar projetos semelhantes.

## Arquivos que devem ser lidos antes

- repositórios de projeto e conteúdo
- API shell de projetos
- tela de listagem de projetos
- `docs/prd/00-product-prd.md`

## Arquivos que podem ser alterados

- repositório de projeto/conteúdo
- API shell de projetos
- UI mínima da listagem, se necessário

## Arquivos que não devem ser alterados

- build/export
- deploy
- histórico

## Escopo do que entra

- ação de duplicar projeto
- duplicação de metadados e conteúdo necessário
- novo identificador para o projeto clonado
- superfície operacional mínima para acionar a duplicação

## Non-goals / o que não entra

- duplicação de histórico
- múltiplos templates sofisticados
- ajustes de deploy automático do clone

## Passos sugeridos

1. definir o que é duplicado
2. implementar duplicação mínima segura
3. expor ação na API shell
4. expor ação mínima na listagem
5. manter operação previsível

## Critérios de aceite

- é possível duplicar um projeto existente
- clone não sobrescreve original
- conteúdo base do clone é preservado
- a ação está operacionalmente acessível

## Validações obrigatórias

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos

- copiar dados demais sem necessidade
- esquecer normalização de ID/slug
- depender implicitamente de UI/API inexistente

## Dependências

- F1-002
- F1-003
- F2-001
- F2-002

## Definição de pronto

Pronto quando o operador conseguir criar um novo projeto a partir de um existente com segurança.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- como a duplicação funciona;
- arquivos alterados;
- validações executadas;
- limitações;
- impactos operacionais.
</think>
Corrigindo `tsconfig.node.json` em F6-002.

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace