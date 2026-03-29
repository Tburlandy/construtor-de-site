# Current Architecture

## O que é este arquivo

Este arquivo explica como o projeto funciona hoje, antes da evolução para multi-projeto.

## Resumo executivo

O projeto atual é um site React/Vite orientado a uma landing principal, com conteúdo centralizado em um único JSON e um Studio de edição acoplado ao mesmo repositório. O build gera um artefato estático. O sistema atual é útil como base, mas ainda é estruturalmente **single-site**, não **multi-projeto**.

## Estrutura principal observada

### Configuração e tooling
- `package.json`
- `vite.config.ts` (base `/pagina/`, dev server em `host: "::"`, `port: 8084`, CORS/headers; plugins condicionais só em `mode === "development"`: `lovable-tagger` / `componentTagger` e `studioPlugin`)
- `eslint.config.js`
- `tailwind.config.ts`
- `tsconfig*.json`

### Conteúdo e schema
- `content/content.json`
- `src/content/schema.ts`
- `src/lib/content.ts`

### SEO
- `src/seo/SEO.tsx`
- `public/robots.txt`
- `public/sitemap.xml`

### Páginas
- `src/App.tsx`
- `src/pages/Index.tsx`
- `src/pages/CityPage.tsx`
- `src/pages/Studio.tsx`
- `src/pages/SdrForm.tsx`
- `src/pages/Teste.tsx`

### Studio / API local
- `studio-server.ts`
- `vite-plugin-studio.ts`
- `src/components/StudioGuard.tsx`

### Upload / mídia
- `public/media/img`
- `public/media/vid`

## Como o site funciona hoje

### Renderização
A aplicação principal usa:
- React
- BrowserRouter
- basename fixo em `/pagina`

Arquivo central:
- `src/App.tsx`

Rotas observadas:
- `/`
- `/energia-solar-em/:slug`
- `/cadastro-sdr`
- `/teste`
- `/dev/studio`
- `*` → `NotFound` (catch-all declarado por último em `Routes`)

### Conteúdo
O conteúdo principal atual está em:
- `content/content.json`

Esse conteúdo é:
- importado diretamente no bundle por `src/lib/content.ts`
- processado com substituição de variáveis como `{{brand}}`, `{{city}}`, `{{siteUrl}}`, `{{whatsappE164}}` (e prefixação de paths relativos com `import.meta.env.BASE_URL` no cliente)

### Fluxo atual do conteúdo
1. JSON único é importado;
2. variáveis são resolvidas;
3. conteúdo processado é usado no app;
4. Studio salva novamente nesse mesmo arquivo.

### Ponto de acoplamento
Toda a operação depende de um único arquivo de conteúdo.

## Schema e validação

O schema do conteúdo usa Zod em:
- `src/content/schema.ts`

Ponto forte:
- já existe disciplina de contrato e validação.

Limitação:
- o schema foi desenhado para um site específico, não para um modelo multi-projeto.

## Studio

O Studio atual vive em:
- `src/pages/Studio.tsx`

Ele oferece:
- edição de variáveis globais;
- SEO;
- hero;
- benefícios;
- projetos;
- uploads;
- save/load do conteúdo.

### API do Studio
Em desenvolvimento (`npm run dev`), a API é atendida por:
- `vite-plugin-studio.ts` (registrado em `vite.config.ts` apenas quando `mode === "development"`)

Também existe:
- `studio-server.ts` (servidor Express exportado como app; **não** há script em `package.json` que o suba — uso manual ou integração externa)

Endpoints observados nos servidores:
- `GET /api/content`
- `PUT /api/content`
- `POST /api/upload-image`
- `POST /api/upload-video`

Paridade dev (`vite-plugin-studio`) vs. `studio-server.ts` (factual):
- ambos leem/gravam `content/content.json` com validação `ContentSchema` no PUT;
- **imagem**: em `studio-server.ts`, após gerar o WebP principal, são criadas variações `-768.webp` e `-1280.webp`; no `vite-plugin-studio.ts` **não** há geração dessas variações (apenas o arquivo principal em `public/media/img`);
- **vídeo**: em ambos o fluxo copia o arquivo para `public/media/vid` (sem transcodificação); respostas JSON podem diferir levemente (ex.: campo `poster`).

Uso observado no frontend do Studio (`src/pages/Studio.tsx`):
- `GET /api/content`
- `PUT /api/content`
- `POST /api/upload-image`
- `POST /api/upload-video` existe na API, mas não é chamado diretamente pela UI atual.

### Proteção
Existe um componente de proteção:
- `src/components/StudioGuard.tsx`

Comportamento implementado no componente:
- senha via `import.meta.env.VITE_STUDIO_PASS`, com fallback fixo no código (`troque-isto`);
- persistência em `sessionStorage`.

Situação atual de roteamento:
- a rota `/dev/studio` em `src/App.tsx` renderiza `Studio` diretamente;
- `StudioGuard` não está conectado ao fluxo atual.

## Upload e mídia

Upload usa:
- imagem: Multer + Sharp
- vídeo: Multer (cópia do arquivo; sem transcodificação real no fluxo atual)

Armazenamento atual:
- `public/media/img`
- `public/media/vid`

Ponto crítico:
- a mídia hoje não está isolada por projeto.

## SEO

Há um componente dedicado:
- `src/seo/SEO.tsx`

Também há artefatos estáticos em:
- `public/robots.txt`
- `public/sitemap.xml`

Situação atual:
- existe preocupação real com SEO, mas os artefatos ainda não são gerados por projeto.

## Build

Script atual:
- `npm run build`

Ele:
- gera `dist`
- copia `.htaccess`
- copia `content.json`

Ponto crítico:
- o build atual é um build de aplicação/site único.

**Nota:** o runtime do site em produção usa o JSON **empacotado** no bundle via import em `src/lib/content.ts`. A cópia para `dist/content/content.json` atende deploy/inspeção ou consumo fora do SPA; o app não faz fetch desse arquivo por padrão.

## Principais gargalos para o PRD

1. single-site hardcoded;
2. base path fixo;
3. conteúdo único;
4. SEO parcialmente estático;
5. Studio acoplado ao site atual;
6. mídia não segmentada por projeto;
7. ausência de persistência multi-projeto;
8. ausência de exportação ZIP operacional;
9. ausência de publicação remota;
10. ausência de histórico/versionamento.

## Baseline validado no código (F0-001)

- `CityPage` está roteada em `src/App.tsx` como `/energia-solar-em/:slug`.
- `npm run build` copia `content/content.json` para `dist/content/content.json` e cria `dist/content` (ver `package.json`).
- `studio-server.ts` não é importado por scripts npm nem pelo app; é módulo à parte para execução manual.
- `src/content/schema.ts` declara `TestimonialSchema` / `ExpertSchema`, mas eles **não** fazem parte de `ContentSchema` (PUT do Studio valida só o contrato principal).

## Assunções / não confirmado apenas pelo código

- `docs/prd/00-product-prd.md` no repositório ainda é placeholder; requisitos de produto finos dependem do PRD colado ali.
- uso “comercial” vs. legado de rotas como `/teste` e `/cadastro-sdr` (existem e estão ligadas em `App.tsx`).
- se algum deploy depende de ler `dist/content/content.json` em runtime (o código do SPA não indica isso).
