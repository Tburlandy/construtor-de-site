# F2-003 — Create project editor shell

## Objetivo
Criar a casca do editor por projeto, sem ainda migrar todos os campos e fluxos do Studio.

## Contexto
Depois da listagem, é necessário existir um lugar claro para editar cada projeto.

## Por que essa task existe
Evita que a adaptação do Studio aconteça de forma confusa e sem contêiner operacional por projeto.

## Arquivos que devem ser lidos antes
- `src/App.tsx`
- `src/pages/Studio.tsx`
- artefatos de `F2-002`
- documentação de arquitetura atual

## Arquivos que podem ser alterados
- `src/App.tsx`
- nova página shell em `src/pages/`
- componentes pequenos auxiliares

## Arquivos que não devem ser alterados
- `src/lib/content.ts`
- `vite.config.ts`
- APIs de upload

## Escopo do que entra
- rota de editor por projeto
- carregamento mínimo do projeto selecionado
- estrutura visual com áreas/abas reservadas

## Non-goals / o que não entra
- salvar conteúdo real do projeto
- upload por projeto
- build/export/deploy
- SEO completo

## Passos sugeridos
1. criar rota do editor por projeto
2. estruturar shell com seções previstas no PRD
3. conectar leitura mínima do projeto
4. preparar encaixe para cards F3

## Critérios de aceite
- existe uma rota funcional de editor por projeto
- o projeto selecionado é resolvido visualmente
- a shell não quebra o fluxo atual

## Validações obrigatórias
```bash
npm run lint
npm run build
```

## Riscos
- transformar esse card em migração completa do Studio
- fazer acoplamento excessivo antes da persistência de conteúdo entrar

## Dependências
- F2-002

## Definição de pronto

Pronto quando a navegação de gestão → editor por projeto estiver funcional em nível shell.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- rota/shell criada;
- arquivos alterados;
- validações executadas;
- limitações;
- pontos preparados para F3.
