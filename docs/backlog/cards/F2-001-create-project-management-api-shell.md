# F2-001 — Create project management API shell

## Objetivo
Expor uma API shell mínima para listar, criar e consultar projetos sem ainda migrar todo o fluxo do Studio.

## Contexto
Após existir persistência de projetos e conteúdo, a UI precisa de um ponto de integração controlado.

## Por que essa task existe
Sem API shell, o frontend tenderá a acoplar leitura/escrita diretamente à persistência nova.

## Arquivos que devem ser lidos antes
- `studio-server.ts`
- `vite-plugin-studio.ts`
- `docs/backlog/cards/F2-001-create-project-management-api-shell.md`
- artefatos de `F1-002`
- artefatos de `F1-003`
- `docs/context/03-current-architecture.md`

## Arquivos que podem ser alterados
- `studio-server.ts`
- `vite-plugin-studio.ts`
- módulos auxiliares mínimos de rotas/handlers

## Arquivos que não devem ser alterados
- `src/pages/Studio.tsx`
- `src/App.tsx`
- componentes visuais

## Escopo do que entra
- endpoint mínimo de listagem de projetos
- endpoint mínimo de criação de projeto
- endpoint mínimo de leitura de um projeto
- resposta clara e tipada

## Non-goals / o que não entra
- edição completa de conteúdo
- upload por projeto
- deploy
- tela visual

## Passos sugeridos
1. mapear padrão atual dos endpoints do Studio
2. adicionar endpoints mínimos de projeto
3. manter implementação pequena
4. não misturar ainda com conteúdo detalhado

## Critérios de aceite
- API shell de projetos existe
- integração segue padrão compatível com o tooling atual
- não houve redesign amplo do servidor/plugin

## Validações obrigatórias
```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

## Riscos
- criar API grande demais cedo
- desalinhar studio-server.ts e vite-plugin-studio.ts

## Dependências
- F1-002
- F1-003

## Definição de pronto
Pronto quando existir uma API shell mínima de projetos pronta para a UI de gestão.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- endpoints criados;
- arquivos alterados;
- validações executadas;
- limitações;
- impactos na UI futura.
