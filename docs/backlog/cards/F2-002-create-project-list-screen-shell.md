# F2-002 — Create project list screen shell

## Objetivo
Criar a tela shell de listagem de projetos com ações mínimas de navegação e criação.

## Contexto
O PRD exige gestão de múltiplos projetos. A UI precisa materializar esse conceito antes da migração do editor.

## Por que essa task existe
Permite navegar operacionalmente pelo domínio multi-projeto sem misturar ainda toda a edição.

## Arquivos que devem ser lidos antes
- `src/App.tsx`
- `src/pages/Studio.tsx`
- endpoints de `F2-001`
- `docs/context/02-conventions.md`

## Arquivos que podem ser alterados
- `src/App.tsx`
- nova página ou shell em `src/pages/`
- componentes pequenos de apoio em `src/components/` se necessários

## Arquivos que não devem ser alterados
- `src/lib/content.ts`
- `vite.config.ts`
- build/export

## Escopo do que entra
- tela de listagem de projetos
- ação de criar novo projeto
- ação de abrir projeto
- shell visual simples e funcional

## Non-goals / o que não entra
- editor completo
- upload
- SEO form completo
- build/export/deploy

## Passos sugeridos
1. definir rota de gestão de projetos
2. implementar tela shell
3. consumir API shell mínima
4. manter layout simples e revisável

## Critérios de aceite
- usuário consegue ver projetos existentes
- usuário consegue acionar criação de novo projeto
- usuário consegue navegar para o editor shell do projeto

## Validações obrigatórias
```bash
npm run lint
npm run build
```
## Riscos
- tentar já recriar todo o Studio
- mexer em layout além do necessário

## Dependências
- F2-001

## Definição de pronto

Pronto quando a gestão de projetos já existir visualmente em nível shell.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- rota/tela adicionada;
- arquivos alterados;
- validações executadas;
- limitações;
- o que ainda falta para o editor shell.
