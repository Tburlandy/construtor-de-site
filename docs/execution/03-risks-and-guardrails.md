```md
# Risks and Guardrails

## O que é este arquivo

Este arquivo mostra os principais riscos de execução com IA neste projeto.

## Riscos principais

### 1. Reinterpretar o produto em cada chat
Prevenção:
- usar o PRD como fonte de verdade;
- iniciar cada task pelo card;
- não pedir “pensa a melhor arquitetura do zero”.

### 2. Misturar tudo na mesma task
Prevenção:
- cards atômicos;
- um card por chat;
- parar quando a task começar a atravessar camadas demais.

### 3. Quebrar SEO ao tentar flexibilizar conteúdo
Prevenção:
- tratar SEO como requisito central;
- build obrigatório em mudanças sensíveis;
- não implementar admin embarcado cedo demais.

### 4. Quebrar build ao introduzir multi-projeto
Prevenção:
- separar fase de build;
- validar build sempre que tocar Vite/config/paths;
- não misturar exportação com redesign grande do app.

### 5. Alterar arquitetura além do necessário
Prevenção:
- política de menor mudança segura;
- rules explícitas de arquitetura;
- cards com arquivos permitidos;
- ADR explícita para persistência MVP e layout de artefatos.

### 6. Perder rastreabilidade
Prevenção:
- formato fixo de encerramento;
- cards persistentes no repositório;
- validações reportadas sempre.

### 7. Fazer refactor por impulso
Prevenção:
- refactor subordinado ao card;
- registrar adjacências, não executá-las.

## Guardrails permanentes

1. PRD é fonte de verdade.
2. ADR estrutural inicial deve ser respeitada até revisão explícita.
3. Cards são a unidade operacional.
4. Um card por chat.
5. Sem refactor amplo.
6. Sem redesign de stack.
7. SEO é requisito central.
8. Build sensível exige validação.
9. Incerteza deve ser explicitada.
10. Fora do escopo, não implementar.
11. Sempre reportar arquivos alterados e validações.
