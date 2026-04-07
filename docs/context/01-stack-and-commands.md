# Stack and Commands

## O que é este arquivo

Este arquivo mostra a stack real do projeto e os comandos que você deve usar para validar mudanças.

## Stack real identificada no projeto

### Frontend
- Vite
- React 18
- TypeScript
- React Router DOM
- TanStack React Query
- React Helmet Async
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide React
- Framer Motion
- Zod
- React Hook Form

### Backend / tooling local
- Express (uso em `studio-server.ts`; no dev do app a API do Studio é middleware do Vite via plugin)
- Multer
- Sharp
- Vite plugin customizado para o Studio em desenvolvimento (`vite-plugin-studio.ts`)
- Em desenvolvimento, o Vite também pode carregar `lovable-tagger` (`componentTagger`) quando `mode === "development"` (ver `vite.config.ts`)

### Arquivos relevantes
- `package.json`
- `vite.config.ts`
- `studio-server.ts`
- `vite-plugin-studio.ts`
- `src/content/schema.ts`

## Comandos existentes no repositório

### Instalação

```bash
npm i
```

### Desenvolvimento

```bash
npm run dev
```

Hoje isso sobe o Vite dev server com `host: "::"` e `port: 8084` (definidos em `vite.config.ts`). Em `mode === "development"`, o plugin do Studio registra `GET/PUT /api/content` e uploads no mesmo origin do dev server.

### Build

```bash
npm run build
```

Esse script hoje:
- roda `vite build`;
- copia `public/.htaccess` para `dist/.htaccess` quando disponível (erro ignorado se o ficheiro não existir);
- cria `dist/content`;
- copia `content/content.json` para `dist/content/content.json`.

### Build em modo development

```bash
npm run build:dev
```

Equivalente ao build acima, mas com `vite build --mode development` (útil para builds com flags de modo; o script de pós-build é o mesmo).

### Lint

```bash
npm run lint
```

### Preview do build

```bash
npm run preview
```

### TypeScript check manual

Não há script `typecheck` no `package.json`. Use quando necessário:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
```

## Ambiente atual observado

### Base path
O projeto usa hoje:
- `base: "/pagina/"` em `vite.config.ts`;
- `BrowserRouter basename="/pagina"` em `src/App.tsx`.

### Conteúdo
Hoje o conteúdo principal vem de:
- `content/content.json`

E é importado diretamente no bundle em:
- `src/lib/content.ts` (sem fetch em runtime para o JSON principal).

A cópia para `dist/content/content.json` é feita no script de build; o SPA continua a usar o JSON embutido via import, salvo alteração futura de carregamento.

### Studio
O Studio atual usa:
- rota `/dev/studio`;
- API local em dev via `vite-plugin-studio.ts` (ativado apenas em `mode === "development"` no `vite.config.ts`);
- ficheiro `studio-server.ts` como alternativa Express, **sem** script dedicado no `package.json`.
- **Paridade:** upload de imagem em `studio-server.ts` gera variações WebP `-768` / `-1280`; o plugin Vite em dev **não** gera essas variações (apenas o ficheiro principal).

`StudioGuard` existe no projeto, mas **não** envolve a rota `/dev/studio` atual em `src/App.tsx` (a rota renderiza `Studio` diretamente).

### Upload
Endpoints de upload disponíveis na API (plugin em dev e `studio-server.ts`):
- imagem: `POST /api/upload-image`
- vídeo: `POST /api/upload-video`

Uso atual no frontend (`src/pages/Studio.tsx`):
- imagem: usa `POST /api/upload-image`;
- vídeo: não há chamada direta para `POST /api/upload-video` na UI atual.

Armazenamento atual:
- `public/media/img`
- `public/media/vid`

## O que não existe hoje

No estado atual do projeto, não foram identificados:
- banco de dados;
- migrations;
- testes automatizados;
- script formal de typecheck no `package.json`;
- script formal de empacotamento ZIP;
- integração FTP/SFTP;
- histórico/versionamento de publicações;
- modelo multi-projeto persistido.

## Regras de validação por tipo de mudança

### Mudanças pequenas de UI

Rodar no mínimo:

```bash
npm run lint
```

### Mudanças em tipos, schema, Vite plugin, Studio server, build

Rodar no mínimo:

```bash
npm run lint
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
npm run build
```

### Mudanças em exportação/publicação

Rodar no mínimo:

```bash
npm run lint
npm run build
```

## Baseline validado no código (F0-001)

- Rotas em `src/App.tsx`: `/`, `/energia-solar-em/:slug`, `/cadastro-sdr`, `/teste`, `/dev/studio`, catch-all `*`.
- Scripts `build` / `build:dev` em `package.json` conferidos literalmente.
- `studio-server.ts` não referenciado por `package.json` nem importado pela app.

## Assunções / não confirmado apenas pelo código

- PRD canónico em `docs/prd/00-product-prd.md` ainda é placeholder no repositório.
- Se deploy ou ferramentas externas dependem de `dist/content/content.json` em runtime (além da cópia no artefato).
- Classificação de negócio das páginas auxiliares (`/teste`, `/cadastro-sdr`).
