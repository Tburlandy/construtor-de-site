```md
# Project Conventions

## O que é este arquivo

Este arquivo diz como organizar mudanças no projeto sem inventar estrutura desnecessária.

## Princípios gerais

1. o PRD manda no produto;
2. a arquitetura atual manda no ponto de partida;
3. a ADR inicial manda nas decisões estruturais do MVP;
4. mudanças devem ser incrementais;
5. refactor só quando necessário para habilitar o card atual;
6. nenhuma camada nova deve ser criada “por elegância” sem necessidade objetiva.

## Convenções de nomenclatura

### Arquivos
- componentes React: `PascalCase.tsx`
- utilitários e libs: `camelCase.ts` ou `kebab-case.ts`
- documentos e backlog: `kebab-case.md`
- cards: prefixo com fase e número, ex. `F3-002-scope-studio-save-load-by-project.md`

### Tipos e schemas
Prefira nomes explícitos:
- `ProjectRecord`
- `ProjectMetadata`
- `ProjectContentRecord`
- `ProjectSeoConfig`
- `DeployTargetRecord`
- `PublicationRecord`

Evite nomes genéricos como:
- `Data`
- `Info`
- `Manager`

## Organização de pastas

### Regra principal
Antes de criar pasta nova, verificar se o projeto já tem local adequado.

### Preferência de organização
- UI React em `src/components` ou `src/pages`
- conteúdo e schema do site em `src/content`
- utilitários em `src/lib`
- contratos do domínio da plataforma em namespace próprio e mínimo, preferencialmente `src/platform/` se o card exigir
- código de servidor ou tooling node em raiz quando já seguir esse padrão, como:
  - `studio-server.ts`
  - `vite-plugin-studio.ts`

### Proibição
Não criar uma árvore paralela inteira de arquitetura sem necessidade confirmada.

Exemplos do que não fazer sem card explícito:
- criar `/server`, `/backend`, `/packages`, `/apps`, `/domain`, `/infrastructure` do nada;
- migrar o projeto para monorepo;
- trocar o bundler;
- trocar o roteador;
- mover tudo para Next.js.

## Padrão de componentes

### Componentes de UI
- pequenos e focados
- extração só quando houver repetição real ou ganho claro de legibilidade
- evitar abstrações genéricas cedo demais

### Páginas
- páginas devem orquestrar componentes e fluxo
- lógica utilitária compartilhável deve ir para `src/lib` ou módulo apropriado

## Padrão de schemas e types

- manter validação com Zod onde o projeto já usa Zod
- não duplicar contrato em múltiplos lugares sem necessidade
- não misturar cedo demais:
  - schema do conteúdo do site
  - contratos do domínio da plataforma

## Regras para mudanças arquiteturais

### Permitido sem aprovação extra
- criar tipos e schemas necessários ao card;
- criar módulos pequenos para persistência ou geração de artefato quando o card pedir;
- ajustar rotas e build quando o card exigir;
- criar camadas mínimas para suportar multi-projeto.

### Não permitido sem aprovação ou card explícito
- refatorar toda a estrutura do projeto;
- mover grandes blocos de arquivos entre pastas;
- substituir o fluxo atual do Studio inteiro em uma tacada só;
- criar “framework interno”;
- trocar o modelo de build por outro stack.

## Política de “não inventar estrutura nova”

- usar primeiro o que já existe;
- só criar nova estrutura quando a atual realmente não comportar a evolução do PRD;
- quando criar algo novo, manter o menor desenho possível;
- documentar incertezas no resumo final.
