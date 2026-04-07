# ADR — MVP Persistence and Artifact Layout

## Status
Aprovada para o MVP operacional deste repositório.

## Objetivo
Congelar as decisões estruturais mínimas para evitar improviso arquitetural nas fases F1-F5:
1. persistência multi-projeto no MVP;
2. layout de mídia por projeto;
3. layout de artefatos operacionais por projeto.

## Contexto validado no código atual
- o projeto atual é single-site e lê conteúdo de `content/content.json`;
- o Studio usa API local (`vite-plugin-studio.ts` em dev e `studio-server.ts` como servidor equivalente) com `GET/PUT /api/content`;
- upload atual grava mídia em `public/media/img` e `public/media/vid`; as respostas da API expõem URLs no formato `/media/img/...` e `/media/vid/...` (servidas a partir de `public/` pelo dev server/build);
- paridade factual Studio: em `studio-server.ts`, upload de imagem gera WebP principal e variações `-768.webp` / `-1280.webp`; em `vite-plugin-studio.ts` só o WebP principal é gerado em `public/media/img`;
- o build atual gera `dist` e copia `content/content.json` para `dist/content/content.json`; o SPA continua a consumir o JSON empacotado via import em `src/lib/content.ts` (a cópia em `dist/content/` é artefato de deploy/inspeção, não o carregador padrão do app);
- o SEO editável hoje mora **dentro** de `ContentSchema` (`content.json` monolítico), não em arquivo separado;
- não há banco de dados nem migrations.

## Legado (hoje) vs alvo MVP (após F1-F5)

| Área | Legado observado no repo | Alvo canônico desta ADR |
|------|--------------------------|-------------------------|
| Conteúdo / persistência | `content/content.json` único | `data/projects/<project-id>/` com `metadata.json`, `content.json`, … |
| Mídia | `public/media/img`, `public/media/vid` (sem escopo de projeto) | `public/media/projects/<project-id>/{img,vid}/` |
| Artefato operacional | `dist/` como saída única do app; ZIP/publicação ainda não padronizados por projeto | `artifacts/<project-id>/build/` e `artifacts/<project-id>/zip/` |
| Identificador de projeto | inexistente no modelo de dados | `<project-id>`: string estável; formato exato (ex. slug kebab vs UUID) fica no contrato introduzido em F1 |

## Decisão 1 — Persistência MVP (file-based)
### Direção adotada
A persistência multi-projeto do MVP permanece file-based. Não haverá banco-first nesta fase.

### Layout canônico
```text
data/
  projects/
    <project-id>/
      metadata.json
      content.json
      seo.json
      deploy-targets.json
      publications/
        <publication-id>.json
```

### Materialização incremental (evitar ambiguidade em F1)
A árvore acima é o **conjunto completo de fronteiras lógicas** do MVP. **Nem todo arquivo precisa existir desde o primeiro PR:**
- **F1** materializa, no mínimo, o que os cards de domínio exigirem (tipicamente `metadata.json` e `content.json` por projeto); repositórios podem recusar leitura de arquivos ainda não criados.
- **`seo.json`**: no código atual o SEO está embutido em `ContentSchema`; a existência de um arquivo dedicado `seo.json` **ou** o desmembramento a partir de `content.json` só é obrigatório quando o backlog mandar (ex. escopo de SEO por projeto em F3/F3-004). Até lá, pode coexistir um único `content.json` alinhado ao schema da landing, desde que o path raiz continue sendo `data/projects/<project-id>/`.
- **`deploy-targets.json`**, **`publications/**`: entram com os cards de deploy/publicação (F5+), não com F1.

### Motivação
- menor blast radius sobre a arquitetura atual;
- reaproveita o padrão de operação local já existente no repositório;
- destrava F1-F5 sem introduzir infraestrutura prematura.

### Limites
- não resolve concorrência forte/multiusuário avançado;
- não substitui uma estratégia futura de auditoria robusta.

## Decisão 2 — Layout de mídia por projeto
### Direção adotada
A mídia deve ser isolada por projeto em paths previsíveis.

### Layout canônico
```text
public/
  media/
    projects/
      <project-id>/
        img/
        vid/
```

### Motivação
- reduz colisão de nomes entre projetos;
- mantém compatibilidade com o modelo de assets locais do projeto atual.

### Limites
- ainda depende de ajustes de referência de path nas fases de conteúdo/build (incluindo `import.meta.env.BASE_URL` / `base: "/pagina/"` no cliente);
- não define storage externo nesta etapa;
- durante a transição, pode haver período em que apenas o projeto “default” ou o legado `public/media/{img,vid}` ainda recebe uploads até F3 escopar mídia por projeto.

## Decisão 3 — Layout de artefatos por projeto
### Direção adotada
Artefatos operacionais por projeto ficam fora do `dist` genérico.

### Layout canônico
```text
artifacts/
  <project-id>/
    build/
    zip/
      <project-id>-<timestamp>.zip
```

### Motivação
- separa build técnico do app e artefato operacional por projeto;
- reduz colisões entre execuções;
- cria base direta para exportação e publicação.

### Limites
- `dist` pode continuar existindo como etapa técnica intermediária do Vite;
- regras exatas de materialização serão detalhadas nos cards de F4.

## Decisão 4 — Contratos do domínio da plataforma
### Direção adotada
Contratos do domínio da plataforma não devem nascer em `src/content/schema.ts`.

Namespace preferencial inicial:
```text
src/platform/
  contracts/
```

### Motivação
- evita acoplamento precoce entre schema do site atual e domínio da plataforma;
- facilita evolução incremental por card.

### Limites
- manter namespace mínimo, sem criar arquitetura ampla além do necessário.

## Consequências para o backlog (F1-F5)
- F1: criar contratos do domínio da plataforma em namespace próprio e persistência baseada em `data/projects/<project-id>/`.
- F2: API/UI shell deve operar com seleção explícita de projeto usando esse modelo file-based.
- F3: conteúdo, mídia e SEO devem ser escopados por projeto; mídia migra para `public/media/projects/<project-id>/`.
- F4: build/export deve materializar artefatos por projeto em `artifacts/<project-id>/`.
- F5: publicação deve usar artefato do projeto, não saída genérica implícita.

## Assunções / validar no código
- permissões de escrita/leitura para `data/` e `artifacts/` no ambiente operacional alvo;
- plano de transição para coexistência temporária com `content/content.json` legado (import estável no bundle até cards mudarem o loader);
- impacto de paths de mídia no build com `base: "/pagina/"`;
- alinhar geração de variações de imagem (`-768`/`-1280`) entre `vite-plugin-studio` e `studio-server` quando a mídia for escopada por projeto (evitar divergência dev vs servidor manual).

## Regra final
Esta ADR vale como decisão estrutural do MVP até card explícito de revisão.
