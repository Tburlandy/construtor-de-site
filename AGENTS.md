# AGENTS.md

## O que é este arquivo

Este arquivo diz ao Cursor/Codex como ele deve trabalhar dentro deste repositório.

## Contexto do repositório

Este repositório contém hoje um site React/Vite orientado a um único site/unidade, com conteúdo centralizado em `content/content.json`, Studio em `/dev/studio`, upload de mídia, build estático e cuidado com SEO.

O objetivo macro do produto é evoluir esse sistema para uma plataforma interna de múltiplos projetos/páginas, preservando o PRD canônico do repositório.

## Fonte de verdade

- Produto: `docs/prd/00-product-prd.md`
- Execução: `docs/execution/00-master-execution-guide.md`
- Arquitetura atual: `docs/context/03-current-architecture.md`
- Decisões estruturais iniciais: `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- Conclusão de task: `docs/execution/02-definition-of-done-and-validation.md`

## Stack atual

- Vite
- React
- TypeScript
- Tailwind
- shadcn/ui
- React Router
- Zod
- Express
- Multer
- Sharp

## Comandos de validação

### Base
```bash
npm i
npm run dev
npm run lint
npm run build

Quando a task alterar tipos, node tooling, Studio server ou build
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json

Regras permanentes
não reescreva o PRD;
não reinterprete o produto fora do PRD;
não expanda escopo;
mantenha tarefas pequenas;
não altere arquitetura sem necessidade real do card atual;
não crie estrutura nova grande sem justificativa;
não mexa fora do escopo do card;
sempre informe arquivos alterados e validações executadas;
sempre sinalize incertezas explicitamente;
se houver conflito entre “elegância” e “menor mudança segura”, prefira a menor mudança segura.
Limites de atuação
Sem card explícito, não:
mover grandes pastas;
trocar stack;
criar monorepo;
reescrever o Studio inteiro;
redesenhar toda a arquitetura;
atualizar dependências por oportunidade;
fazer refactor amplo.
Regra de não expandir escopo
Execute somente o card atual.
Se surgir trabalho adjacente:
mencione no resumo final;
não implemente sem novo card.
Regra de arquitetura
Respeite a arquitetura existente como ponto de partida.
A evolução deve ser incremental e com o menor blast radius possível.
Para contratos do domínio da plataforma, não acople cedo demais em src/content/schema.ts.
Prefira um namespace próprio e mínimo para o domínio da plataforma, conforme os cards e a ADR estrutural.
Regra de entrega
Ao concluir qualquer task, responda com:
resumo do que foi feito;
arquivos alterados;
validações executadas;
limitações / assunções;
próximos riscos ou dependências.
Regra de contexto
Antes de implementar:
leia o card;
leia os arquivos obrigatórios do card;
leia as rules aplicáveis;
não comece por inferência.
