# Implementation Strategy

## O que é este arquivo

Este arquivo mostra a ordem das fases, sem mudar a estratégia do projeto.

## Fases

### F0 — Baseline e decisões habilitadoras
Objetivo:
- validar o baseline atual;
- registrar a decisão concreta de persistência MVP, layout de mídia e layout de artefatos por projeto (card `F0-002`), incluindo legado vs alvo e **materialização incremental** dos arquivos sob `data/projects/<project-id>/`.

Referência estrutural canônica da fase:
- `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`

Layouts canônicos definidos em F0:
- `data/projects/<project-id>/`
- `public/media/projects/<project-id>/`
- `artifacts/<project-id>/`

### F1 — Contratos e persistência multi-projeto
Objetivo:
- introduzir contratos centrais do domínio da plataforma;
- persistir metadados e conteúdo por projeto.

### F2 — Casca operacional de API e UI
Objetivo:
- criar o esqueleto de gestão de projetos;
- permitir navegar entre projetos sem ainda completar toda a edição.

### F3 — Conteúdo, mídia e SEO escopados por projeto
Objetivo:
- fazer o fluxo central funcionar por projeto.

### F4 — Build e exportação
Objetivo:
- gerar artefato por projeto;
- criar artefatos de SEO por projeto;
- entregar ZIP.

### F5 — Deploy remoto
Objetivo:
- cadastrar destino;
- testar conexão;
- publicar.

### F6 — Histórico e operação
Objetivo:
- dar rastreabilidade mínima;
- habilitar duplicação operacional segura.

### F7 — Admin embarcado
Objetivo:
- estudar com rigor a viabilidade e os limites.

## Dependências entre fases

- F0 desbloqueia F1
- F1 desbloqueia F2
- F2 desbloqueia F3
- F3 desbloqueia F4
- F4 desbloqueia F5
- F5 desbloqueia F6
- F6 precede F7

Regra de execução:
- F1-F5 devem seguir a ADR de `docs/context/04-mvp-persistence-and-artifact-layout-adr.md`, salvo card explícito de revisão dessa ADR.

## Regra prática

Sempre trabalhar por card pequeno.
Sempre um card por chat.
