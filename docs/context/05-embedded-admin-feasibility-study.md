# Embedded Admin Feasibility Study (F7 seed)

## Objetivo
Registrar um parecer curto sobre a viabilidade de admin embarcado no app atual, sem implementar esse admin neste card.

## Base factual observada no projeto real
- O app principal é SPA React com `BrowserRouter` e `basename="/pagina"` em `src/App.tsx`.
- O fluxo de edição atual fica em `/dev/studio` e usa API local (`studio-server.ts` e `vite-plugin-studio.ts`).
- A API atual não implementa autenticação robusta por usuário/papel; o guard atual (`src/components/StudioGuard.tsx`) não está conectado à rota principal do Studio.
- A persistência é file-based em `data/projects/<project-id>/`, com operações operacionais via endpoints locais.

## Opções avaliadas (curtas)
1. Admin embarcado agora (dentro da SPA atual):
- Vantagem: menos fricção de navegação no curto prazo.
- Risco: mistura superfície pública e operação sem camada de auth/auditoria adequada; aumenta blast radius em rotas, build e segurança.

2. Manter operação separada da experiência pública (incremental):
- Vantagem: mantém isolamento operacional, reduz risco imediato e permite endurecer auth/autorização antes de ampliar escopo.
- Risco: UX de operação menos integrada no curtíssimo prazo.

## Recomendação
Não implementar admin embarcado completo nesta fase.

Direção recomendada para evolução:
- manter a trilha operacional atual (`/dev/studio/projects/*`) e evoluir incrementalmente;
- só considerar admin embarcado após card específico de segurança/controle de acesso (auth + autorização + trilha mínima de auditoria);
- tratar embarque no app principal como etapa posterior, com critérios explícitos de segurança e baixo blast radius.

## Critério de reavaliação
Reavaliar quando existir card dedicado que cubra, no mínimo:
- proteção de rota operacional baseada em identidade real (não apenas senha estática);
- autorização por papel;
- estratégia mínima de auditoria para ações sensíveis.
