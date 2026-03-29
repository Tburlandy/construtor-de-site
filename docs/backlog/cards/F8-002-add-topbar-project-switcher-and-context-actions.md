# F8-002 — Add topbar project switcher and context actions

## Objetivo

Implementar no topo do builder o switch de projeto e a área de ações globais, mantendo o usuário no mesmo contexto visual.

## Contexto

Depois da shell visual, o próximo bloqueador é trocar projeto sem retornar para telas técnicas de listagem.

## Por que essa task existe

A troca rápida de projeto no topo é requisito central do PRD complementar de builder.

## Arquivos que devem ser lidos antes

- AGENTS.md
- docs/prd/00-product-prd.md
- docs/backlog/cards/PRD5-001-visual-builder-experience.md
- docs/backlog/cards/F8-001-create-builder-workspace-shell.md
- src/pages/StudioProjectShell.tsx
- src/pages/StudioProjectList.tsx
- src/platform/studio/projectsStudioApi.ts

## Arquivos que podem ser alterados

- src/pages/StudioProjectShell.tsx
- componentes em src/components/studio-builder/
- cliente de API do Studio, se necessário, sem alterar contrato

## Arquivos que não devem ser alterados

- persistência de projetos
- studio-server.ts (exceto se erro bloqueante comprovado)
- fluxo de build/export/deploy

## Escopo do que entra

- seletor de projeto na barra superior
- carregamento de lista de projetos para o seletor
- troca de projeto com navegação para /dev/studio/projects/:projectId
- atualização do estado visual do builder após troca
- placeholders/slots de ações globais: salvar, visualizar, exportar ZIP, publicar

## Non-goals / o que não entra

- implementação completa de exportar/publicar no topo
- criação/duplicação de projeto no topo (card posterior)
- refactor amplo da listagem de projetos

## Passos sugeridos

1. criar componente Topbar do builder
2. integrar listagem de projetos no seletor
3. trocar projeto via navegação mantendo o shell aberto
4. reservar área de ações globais com estados mínimos

## Critérios de aceite

- o topo exibe projeto ativo
- o usuário troca projeto diretamente no topo
- ao trocar projeto, preview e painel lateral são recarregados no novo contexto
- ações globais têm espaço visual estável no topo

## Validações obrigatórias

```bash
npm run lint
npm run build
```

## Riscos

- regressão de roteamento entre projetos
- misturar ação global com lógica ainda não implementada

## Dependências

- F8-001
- F2-002
- F2-003

## Definição de pronto

Pronto quando a troca de projeto no topo estiver funcional e integrada ao contexto do builder.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- resumo do que foi feito;
- arquivos alterados;
- validações executadas;
- limitações / assunções;
- próximos riscos ou dependências.
