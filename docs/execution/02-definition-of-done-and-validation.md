# Definition of Done and Validation

## O que é este arquivo

Este arquivo diz quando uma task pode ser considerada pronta.

## Regra geral de pronto

Uma task só está pronta quando:

1. o objetivo do card foi concluído;
2. o escopo do card foi respeitado;
3. as validações mínimas foram executadas;
4. as limitações foram informadas;
5. os arquivos alterados foram listados;
6. nada relevante fora do escopo foi implementado sem explicação.

## Formato obrigatório no final de cada task

O agente deve sempre responder com:

1. Resumo
2. Arquivos alterados
3. Validações executadas
4. Limitações / assunções
5. Próximos riscos / dependências

## Validação mínima por tipo de mudança

### 1. Mudança só documental
Exigir:
- revisão manual do conteúdo
- consistência com PRD e documentos do kit

### 2. Mudança de UI isolada
Exigir no mínimo:
```bash
npm run lint

Se tocar roteamento, shell principal ou providers:
npm run build

3. Mudança em types, schemas, utilitários compartilhados
Exigir:
npm run lint
npx tsc --noEmit -p tsconfig.app.json

Se tocar tooling node, plugin Vite ou server:
npx tsc --noEmit -p tsconfig.node.json

4. Mudança em conteúdo, Studio, build, Vite config ou SEO
Exigir:
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build

5. Mudança em exportação/publicação
Exigir:
npm run lint
npm run build

E também:
validação localizada do fluxo implementado;
registro claro do que não pôde ser testado localmente.
Como reportar limitações
Use formato explícito:
Limitação: ...
Assunção / validar no código: ...
Não validado localmente: ...
Regra final
Concluir uma task sem validação explícita gera falso progresso.
Neste projeto, falso progresso é pior do que progresso parcial bem relatado.
