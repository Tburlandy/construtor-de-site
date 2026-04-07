# Backlog Overview

## O que é este arquivo

Este arquivo mostra o backlog em alto nível, por fase.

## Fases

### F0 — Baseline e decisões habilitadoras
Saída:
- baseline validado (`F0-001`);
- ADR explícita e alinhada ao código atual, registrada em `docs/context/04-mvp-persistence-and-artifact-layout-adr.md` (`F0-002`); demais fases citam esse arquivo como referência estrutural;
- persistência MVP file-based por projeto definida em `data/projects/<project-id>/`;
- layout de mídia por projeto definido em `public/media/projects/<project-id>/`;
- layout de artefatos por projeto definido em `artifacts/<project-id>/`.

### F1 — Domínio e persistência multi-projeto
Saída:
- contratos centrais definidos;
- persistência mínima de projetos;
- persistência mínima de conteúdo por projeto.

### F2 — Gestão de projetos: API shell e UI shell
Saída:
- endpoints básicos;
- tela de listagem;
- shell de editor por projeto.

### F3 — Conteúdo, mídia e SEO por projeto
Saída:
- conteúdo por projeto;
- mídia por projeto;
- SEO por projeto.

### F4 — Build e exportação
Saída:
- build parametrizado;
- ZIP por projeto;
- robots/sitemap por projeto.

### F5 — Deploy
Saída:
- destinos persistidos;
- teste FTP/SFTP;
- publicação com log.

### F6 — Histórico/versionamento operacional básico
Saída:
- leitura de histórico de publicações;
- duplicação segura de projeto.

### F7 — Estudo do admin embarcado
Saída:
- parecer técnico baseado em evidência;
- recomendação explícita.

### F8 — Builder visual multi-projeto
Saída:
- shell visual de construtor com topo, lateral e preview;
- troca de projeto no topo sem sair do builder;
- edição contextual por seção;
- criação/duplicação de projeto no contexto do builder;
- sincronização básica seção ativa x preview.

## Regra do backlog

Cada item do backlog deve ser implementado por card atômico.
Se um card crescer demais, ele deve ser dividido antes da execução.

F1-F5 devem respeitar a ADR de `docs/context/04-mvp-persistence-and-artifact-layout-adr.md` até revisão explícita.
