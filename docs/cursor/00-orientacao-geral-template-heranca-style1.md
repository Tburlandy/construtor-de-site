# Orientação Geral — Template Central do Estilo 1 com Herança por Campo

Este documento é a referência-base para todos os prompts dos cards de implementação no Cursor.

## Objetivo macro

Implementar no projeto `Tburlandy/construtor-de-site` uma arquitetura de **template central do Estilo 1** com **herança por campo** e **overrides por cliente**, preservando a UX atual do builder por cliente e mantendo compatibilidade com o modelo atual de `Content`.

## Estado atual do projeto

O projeto já possui:

- área central em `/construtor`;
- editor por cliente em `/cliente/:clientId`;
- preview por cliente em `/preview/:clientId`;
- API principal em `studio-server.ts`;
- schema único de conteúdo em `src/content/schema.ts`;
- persistência file-based em `data/projects/<projectId>/...`;
- persistência opcional em Supabase via `src/platform/repositories/supabaseStudioRepositories.ts`.

## Princípios obrigatórios

1. **Não quebrar a tela atual do cliente.**
   O builder do cliente continua sendo a principal tela operacional.

2. **Compatibilidade retroativa obrigatória.**
   O endpoint `GET /api/projects/:projectId/content` deve continuar podendo abastecer a UI atual com um `Content` completo.

3. **A herança é por campo.**
   Para arrays/blocos compostos, na V1 a herança pode ser por bloco inteiro.

4. **Remover override não é copiar valor.**
   Remover override significa voltar ao estado herdado real.

5. **Não introduzir dependência nova sem necessidade real.**
   Preferir helpers internos a adicionar `lodash.*`.

6. **Usar Zod em todas as fronteiras novas.**
   Contratos, repositórios e payloads devem ser validados.

7. **Manter separação clara entre camadas.**
   Contratos em `src/platform/contracts`, persistência em `src/platform/repositories`, regra de negócio em `src/platform/studio`, UI em `src/pages`, `src/components`, `src/hooks`.

8. **Salvar snapshots resolvidos no histórico.**
   O histórico deve continuar útil sem exigir refactor grande no módulo de versões.

## Modelo conceitual final da V1

A feature deve introduzir três camadas lógicas:

### 1. Template central
Representa o padrão oficial do Estilo 1.

### 2. Estado do cliente
Contém:
- variáveis do cliente;
- overrides por path;
- lista de paths overrideados.

### 3. Conteúdo resolvido do cliente
É o `Content` final usado em:
- builder;
- preview;
- publicação;
- exportação.

## Regra de resolução

A resolução do conteúdo do cliente deve seguir esta ordem:

1. carregar o template central `style-1`;
2. aplicar interpolação de variáveis em todos os strings;
3. aplicar overrides do cliente por cima;
4. validar com `ContentSchema`;
5. retornar o `Content` resolvido.

## Variáveis mínimas da V1

Além das variáveis já suportadas no projeto, adicionar pelo menos:

- `yearsInMarket`
- `projectCount`

Manter funcionando:

- `brand`
- `city`
- `siteUrl`
- `whatsappE164`

## Campos simples x blocos compostos

### Campos simples
Podem ter override por path simples, por exemplo:

- `global.brand`
- `global.city`
- `seo.title`
- `hero.headline`
- `hero.subheadline`
- `proofBar.description`
- `showcase.titleHighlight`

### Blocos compostos na V1
Devem virar override como unidade única:

- `hero.stats`
- `header.menu`
- `financing.items`
- `proofBar.cards`
- `fullService.services`
- `howItWorks.steps`
- `showcase.projects`
- `benefits`
- `hiddenPageSections`
- `imageLayout`

## Persistência recomendada

### File-based

#### Template central
- `data/studio/base-templates/style-1.json`

#### Estado do cliente
- `data/projects/<projectId>/template-state.json`

### Supabase
Adicionar suporte equivalente em tabelas novas:

- `studio_base_templates`
- `studio_client_template_states`

## Compatibilidade de API

### Leitura de conteúdo do cliente
`GET /api/projects/:projectId/content` deve continuar compatível e devolver `Content` resolvido.

Opcionalmente pode suportar `?includeInheritanceMeta=1`.

### Save do cliente
`PUT /api/projects/:projectId/content` continua recebendo `Content` completo do front.

O backend passa a converter esse `Content` em `overrides` comparando com o template central.

## Migração de clientes existentes

### Regra obrigatória
Nenhum cliente existente pode ser sobrescrito visualmente pela entrada da feature.

### Estratégia

1. consolidar baseline inicial do Estilo 1;
2. garantir que esse baseline exista como template central;
3. para cada cliente:
   - carregar `Content` atual;
   - comparar com baseline;
   - se campo == baseline, marcar como herdado;
   - se campo != baseline, registrar como override;
4. salvar `template-state.json`;
5. validar que o conteúdo resolvido final permaneceu idêntico ao estado anterior.

## Regras de UI

### Central do template
Criar página dedicada para editar o template padrão do Estilo 1, reaproveitando a estrutura do builder atual.

### Builder do cliente
A UI atual deve mudar pouco. A V1 deve expor no mínimo:

- badge “Herdado”;
- badge “Personalizado”;
- ação “Voltar ao padrão”;
- seção de variáveis do cliente em Configurações do Cliente.

### Divergência na central
A central deve mostrar na V1:

- divergência por seção;
- divergência por path nos principais campos;
- lista de clientes fora do padrão em um path.

## Ordem recomendada de implementação

1. contratos novos;
2. repositórios novos;
3. utilitários de path e variáveis;
4. serviço de herança;
5. endpoints do template central;
6. adaptação do `GET /content` do cliente;
7. adaptação do `PUT /content` do cliente;
8. endpoints de reset;
9. script de migração;
10. página da central;
11. hooks de herança;
12. badges e reset na UI do cliente;
13. divergência na central;
14. testes.

## Convenções de implementação

- usar TypeScript em tudo que for novo em `src/`;
- usar nomes explícitos;
- manter funções pequenas e puras quando possível;
- evitar acoplamento entre front e backend;
- não mover arquivos grandes sem necessidade;
- fazer refactor mínimo e incremental;
- preservar endpoints antigos quando possível;
- documentar TODO relevante apenas quando realmente necessário.

## Definition of Done de cada card

Todo card entregue deve:

1. compilar logicamente dentro da arquitetura existente;
2. respeitar os contratos e a orientação deste documento;
3. não quebrar compatibilidade principal do fluxo atual;
4. conter arquivos criados/alterados exatamente dentro do escopo do card;
5. incluir checklist final do que foi feito;
6. listar riscos, pendências e próximos passos quando houver.

## Formato esperado de resposta do Cursor em cada card

Ao concluir um card, a resposta deve trazer:

- resumo do que foi implementado;
- lista de arquivos criados;
- lista de arquivos alterados;
- decisões técnicas tomadas;
- pontos de atenção;
- checklist de aceite.
