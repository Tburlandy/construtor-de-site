# F1-001 — Create platform domain contracts

## Objetivo
Introduzir os contratos centrais do domínio da plataforma multi-projeto em um namespace próprio, sem acoplar cedo demais ao schema do conteúdo do site.

## Contexto
O sistema atual tem `src/content/schema.ts` para o conteúdo do site único. O PRD exige conceitos de projeto, conteúdo por projeto, SEO por projeto, destino de deploy e publicação. Esses contratos pertencem ao domínio da plataforma, não ao schema do conteúdo do site.

## Por que essa task existe
Sem contratos centrais e bem localizados, a implementação tende a espalhar estruturas inconsistentes e a misturar domínios.

## Arquivos que devem ser lidos antes
- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`
- `src/content/schema.ts`
- `docs/context/02-conventions.md`

## Arquivos que podem ser alterados
- novos arquivos mínimos em `src/platform/contracts/`
- `docs/context/02-conventions.md` se ajuste pontual de convenção for estritamente necessário

## Arquivos que não devem ser alterados
- `src/content/schema.ts`, salvo ajuste pontual estritamente necessário para interoperabilidade
- `src/pages/Studio.tsx`
- `src/App.tsx`
- `vite.config.ts`

## Escopo do que entra
- criar contratos/schemas/tipos para:
  - projeto
  - metadados de projeto
  - conteúdo por projeto
  - SEO por projeto
  - destino de deploy
  - publicação
- manter separação clara entre domínio da plataforma e schema do conteúdo do site

## Non-goals / o que não entra
- persistência
- API
- UI
- build
- deploy

## Passos sugeridos
1. mapear contratos mínimos do domínio
2. criar namespace pequeno para contratos da plataforma
3. manter interoperabilidade com o conteúdo atual sem fundir os domínios
4. não conectar ainda aos fluxos visuais

## Critérios de aceite
- existem contratos explícitos e reutilizáveis para o domínio multi-projeto
- o schema atual do conteúdo do site continua funcional
- nenhuma mudança de UI foi necessária
- o domínio da plataforma não ficou misturado em `src/content/schema.ts`

## Validações obrigatórias
```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
```

## Riscos
- acoplar contratos novos cedo demais ao fluxo existente
- tentar resolver persistência dentro do mesmo card
- criar uma estrutura grande demais para contratos simples

## Dependências
- `F0-002`

## Definição de pronto
Pronto quando os contratos centrais estiverem definidos e compilando sem alterar o comportamento visível do app.

## Instrução final de entrega para o agente
Ao concluir, responda com:
- contratos criados ou ajustados;
- arquivos alterados;
- validações executadas;
- limitações;
- quais cards ficam destravados.

Prompt pronto para colar no Cursor/Codex para executar esse card:

Leia AGENTS.md, as rules aplicáveis em .cursor/rules/, docs/execution/02-definition-of-done-and-validation.md e o card docs/backlog/cards/F1-001-create-platform-domain-contracts.md. Execute apenas esse card. Não expanda escopo. Leia todos os arquivos obrigatórios do card antes de qualquer alteração. Ao final, responda com: contratos criados ou ajustados; arquivos alterados; validações executadas; limitações; quais cards ficam destravados.
