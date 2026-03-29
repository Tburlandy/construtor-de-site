# Deploy Studio online em Vercel + Supabase

Este fluxo habilita edição online com persistência em banco (projetos, conteúdo, SEO e histórico de versões).

## 1) Criar projeto no Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute `docs/deploy/supabase-studio-schema.sql`.
3. Em Storage, crie bucket público `studio-media` (ou use outro nome e configure a env correspondente).

## 2) Configurar variáveis no Vercel

No projeto da Vercel, adicione:

- `VITE_STUDIO_ENABLED=true`
- `SUPABASE_URL=<url-do-projeto-supabase>`
- `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
- `SUPABASE_STORAGE_BUCKET=studio-media`

## 3) Deploy

1. Conecte o repositório na Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Deploy.

O arquivo `vercel.json` já está configurado para:

- servir o SPA do Vite;
- encaminhar `api/*` para a função serverless baseada em `studio-server.ts`.

## 4) O que passa a persistir no banco

- `studio_projects`: metadados do cliente/projeto
- `studio_project_contents`: conteúdo do projeto
- `studio_project_seo_configs`: SEO por projeto
- `studio_project_versions`: histórico de versões

Mídia (`upload-image`/`upload-video`) passa a ir para Supabase Storage quando `SUPABASE_*` estiver configurado.

## 5) Fluxo ZIP (Hostinger/Hostgator)

O fluxo de ZIP/export está preservado e separado do deploy Vercel do Studio.

Observação operacional: por limites de runtime serverless, a exportação ZIP deve continuar sendo tratada pelo seu fluxo operacional dedicado (local/runner), não como etapa principal dentro do Vercel serverless.
