# Card Index

## Ordem recomendada

### F0
1. `F0-001-validate-current-baseline.md`
2. `F0-002-record-mvp-persistence-and-artifact-layout-adr.md`

### F1
3. `F1-001-create-platform-domain-contracts.md`
4. `F1-002-implement-project-metadata-repository.md`
5. `F1-003-implement-project-content-repository.md`

### F2
6. `F2-001-create-project-management-api-shell.md`
7. `F2-002-create-project-list-screen-shell.md`
8. `F2-003-create-project-editor-shell.md`

### F3
9. `F3-001-scope-content-loading-by-project.md`
10. `F3-002-scope-studio-save-load-by-project.md`
11. `F3-003-scope-media-storage-by-project.md`
12. `F3-004-add-project-seo-configuration-persistence.md`

### F4
13. `F4-001-externalize-build-config-per-project.md`
14. `F4-002-generate-project-scoped-seo-artifacts.md`
15. `F4-003-add-zip-export-flow.md`

### F5
16. `F5-001-add-deploy-target-model.md`
17. `F5-002-add-ftp-sftp-connection-test.md`
18. `F5-003-add-publish-service-and-logs.md`

### F6
19. `F6-001-add-publication-history-read-model.md`
20. `F6-002-add-duplicate-project-action.md`

### F7
21. `F7-001-embedded-admin-feasibility-study.md`

## Dependências resumidas

- `F0-001` não depende de card anterior
- `F0-002` depende de `F0-001`

- `F1-001` depende de `F0-002`
- `F1-002` depende de `F1-001`
- `F1-003` depende de `F1-001` e `F1-002`

- `F2-001` depende de `F1-002` e `F1-003`
- `F2-002` depende de `F2-001`
- `F2-003` depende de `F2-002`

- `F3-001` depende de `F2-003`
- `F3-002` depende de `F3-001`
- `F3-003` depende de `F3-002`
- `F3-004` depende de `F3-001`

- `F4-001` depende de `F3-004`
- `F4-002` depende de `F4-001`
- `F4-003` depende de `F4-001` e `F4-002`

- `F5-001` depende de `F4-003`
- `F5-002` depende de `F5-001`
- `F5-003` depende de `F5-002`

- `F6-001` depende de `F5-003`
- `F6-002` depende de `F1-002`, `F1-003`, `F2-001` e `F2-002`

- `F7-001` depende de `F6-001`

## Referência estrutural de F0

- `F0-002` consolida e revisa a ADR em `docs/context/04-mvp-persistence-and-artifact-layout-adr.md` (persistência file-based, mídia e artefatos por projeto, namespace `src/platform/` para contratos da plataforma).
- layouts canônicos definidos para F1-F5: `data/projects/<project-id>/`, `public/media/projects/<project-id>/` e `artifacts/<project-id>/`.
- F1-F5 devem seguir essa ADR até existir card explícito de revisão; arquivos opcionais na árvore de `data/projects/` (ex. `seo.json`, `deploy-targets.json`) materializam-se conforme os cards de cada fase, conforme a própria ADR.
