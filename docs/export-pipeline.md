# Export Pipeline (Template + Overlay)

## Arquitetura antiga vs nova

### Antes (legado)
- Cada exportação de cliente podia rodar build dedicado (`vite build`) por projeto.
- Havia pipeline assíncrono com `studio_export_jobs` e workflow GitHub acionado para processar fila.
- A function podia empacotar toolchain de build (Vite/Rollup/Esbuild) para executar export.
- O caminho crítico de export dependia de cron/workflow externo.

### Agora (atual)
- O projeto gera um template exportável único em `.export-template/current/site`.
- A exportação do cliente usa overlay: copia template, aplica `basePath`, injeta `content/content.json`, gera SEO e zipa.
- O endpoint `POST /api/clients/:clientId/export-zip` executa o fluxo direto via `clientExportService`.
- A function da Vercel faz I/O leve (cópia/substituição/zip/upload), sem rebuild por cliente.

## Como gerar o template exportável

1. Instalar dependências:

```bash
npm install
```

2. Gerar build e template:

```bash
npm run build
```

3. Validar artefatos:
- `.export-template/current/site`
- `.export-template/current/metadata.json`
- `.export-template/current/site/content/content.json`

## Como exportar um cliente

Exemplo (ambiente local):

```bash
curl -X POST http://localhost:3001/api/clients/<clientId>/export-zip
```

Resposta esperada (resumo):
- `clientId`
- `buildPath`
- `buildConfig` (`basePath`, `domain`)
- `zip` (`fileName`, `sizeInBytes`, `createdAt`, `downloadUrl`)

Com Supabase configurado, o fluxo envia o ZIP para o bucket (`studio-exports` por padrão) e retorna URL assinada.
Sem Supabase, mantém fallback local em `artifacts/clients/<clientId>/zip`.

## Como a Vercel usa `.export-template/current`

`vercel.json` inclui na function apenas:
- `content/**`
- `data/projects/**`
- `.export-template/current/**`

Isso garante que a API de export encontre o template em runtime sem carregar toolchain de build na function.

## Como o Supabase Storage recebe o ZIP

No `clientExportService`:
1. o ZIP é gerado localmente;
2. se houver `supabaseClient`, o arquivo é enviado para `clients/<clientId>/<fileName>.zip` no bucket de exports;
3. o serviço gera `signedUrl` para download e retorna no payload.

## Migração de GitHub Actions

- Workflow antigo removido: `process-export-jobs.yml` (cron + processamento de fila por cliente).
- Workflow atual: `build-export-template.yml` (build do template em `push`/`pull_request`/`workflow_dispatch`).
- O artifact publicado no CI é `.export-template/current`.

## Checklist manual de validação

- [ ] `npm install`
- [ ] `npm run build`
- [ ] validar `.export-template/current`
- [ ] testar `POST /api/clients/:clientId/export-zip`
- [ ] baixar ZIP retornado
- [ ] abrir ZIP em hospedagem estática
- [ ] validar `content/content.json`
- [ ] validar `sitemap.xml` e `robots.txt`
- [ ] validar GTM no site exportado

## Critérios de sucesso

- [x] não existe build por cliente
- [x] export funciona com template pronto
- [x] API da Vercel faz I/O leve
- [x] Supabase continua sendo storage oficial dos ZIPs
- [x] GitHub Actions não fica no caminho crítico
