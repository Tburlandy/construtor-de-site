# F0-001 — Validate current baseline

## Objetivo
Validar no código os contratos e comportamentos atuais de conteúdo, Studio, build, roteamento e SEO antes de iniciar qualquer alteração estrutural.

## Contexto
O PRD parte de um projeto real que hoje é single-site. Antes de introduzir multi-projeto, é necessário confirmar o baseline operacional no repositório.

## Por que essa task existe
Evita que a implementação comece em cima de suposições erradas sobre build, Studio, conteúdo e paths.

## Arquivos que devem ser lidos antes
- `docs/prd/00-product-prd.md`
- `docs/context/03-current-architecture.md`
- `docs/context/01-stack-and-commands.md`
- `package.json`
- `vite.config.ts`
- `src/App.tsx`
- `src/lib/content.ts`
- `src/content/schema.ts`
- `src/pages/Studio.tsx`
- `studio-server.ts`
- `vite-plugin-studio.ts`

## Arquivos que podem ser alterados
- `docs/context/03-current-architecture.md`
- `docs/context/01-stack-and-commands.md`

## Arquivos que não devem ser alterados
- arquivos de código do produto

## Escopo do que entra
- validar se os fluxos documentados batem com o código atual
- corrigir documentação do kit se houver divergência factual
- explicitar assunções não confirmadas

## Non-goals / o que não entra
- implementar qualquer funcionalidade
- alterar build
- alterar Studio
- criar arquitetura nova

## Passos sugeridos
1. ler os arquivos obrigatórios
2. conferir comandos e scripts existentes
3. confirmar fluxo atual de conteúdo, Studio e build
4. ajustar apenas a documentação se houver erro factual

## Critérios de aceite
- documentação de arquitetura e stack está factual e consistente com o código
- divergências relevantes foram registradas
- nenhuma alteração de código foi feita

## Validações obrigatórias
- revisão manual dos arquivos lidos

## Riscos
- documentar algo como fato sem ter confirmado no código
- começar a "já corrigir" código fora do escopo

## Dependências
- nenhuma

## Definição de pronto
Pronto quando o baseline atual estiver validado documentalmente e o repositório não tiver sofrido alteração funcional.

## Instrução final de entrega para o agente
Ao concluir, responda com:
1. resumo do que foi validado;
2. arquivos documentais alterados;
3. divergências encontradas;
4. assunções remanescentes;
5. confirmação de que nenhum código do produto foi alterado.
