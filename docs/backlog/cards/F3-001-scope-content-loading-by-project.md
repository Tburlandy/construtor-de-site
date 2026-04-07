# F3-001 — Scope content loading by project

## Objetivo
Fazer o carregamento de conteúdo operar por projeto no novo fluxo, sem ainda migrar integralmente toda a UI de edição.

## Contexto
Hoje `src/lib/content.ts` opera com um JSON único importado no bundle. O PRD exige conteúdo por projeto.

## Por que essa task existe
Esse é o ponto de inflexão real entre single-site e multi-projeto.

## Arquivos que devem ser lidos antes
- `src/lib/content.ts`
- `src/content/schema.ts`
- repositório de conteúdo criado em `F1-003`
- shell de editor criada em `F2-003`

## Arquivos que podem ser alterados
- `src/lib/content.ts`
- módulos auxiliares de acesso a conteúdo
- partes estritamente necessárias da shell do editor

## Arquivos que não devem ser alterados
- `vite.config.ts`
- build/export
- upload de mídia

## Escopo do que entra
- leitura de conteúdo por projeto no novo fluxo
- contrato claro entre frontend e API/repositório
- manutenção do comportamento atual onde necessário para transição

## Non-goals / o que não entra
- upload por projeto
- salvar conteúdo pelo Studio
- SEO artifacts
- exportação

## Passos sugeridos
1. identificar pontos de leitura do conteúdo
2. introduzir caminho por projeto para o novo fluxo
3. preservar transição segura para o fluxo legado quando necessário
4. não completar ainda toda a edição

## Critérios de aceite
- o editor shell já consegue resolver conteúdo do projeto selecionado
- o sistema não depende apenas do JSON global para o novo fluxo
- a mudança continua revisável

## Validações obrigatórias
```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Riscos
- quebrar renderização do site atual
- misturar demais transição legado/novo

## Dependências
- F2-003
- F1-003

## Definição de pronto

Pronto quando o novo fluxo puder ler conteúdo por projeto sem depender exclusivamente do JSON único global.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- como o conteúdo passou a ser resolvido;
- arquivos alterados;
- validações executadas;
- limitações;
- impactos no fluxo legado.
