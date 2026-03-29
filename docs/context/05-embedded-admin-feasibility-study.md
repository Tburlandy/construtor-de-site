# Embedded Admin Feasibility Study (F7-001)

## Objetivo do parecer

Avaliar, de forma curta e objetiva, se o admin embarcado no site publicado deve entrar no MVP sem quebrar os requisitos centrais já explicitados no repositório: build estático, SEO e operação incremental.

## Premissas verificadas no código atual

- O site publicado é gerado por build estático (`vite build`) e deploy por artefato.
- O Studio atual opera em API local de desenvolvimento (`vite-plugin-studio.ts`) ou servidor manual (`studio-server.ts`), não como serviço de produção já endurecido.
- Persistência MVP é file-based (`data/projects/<project-id>/...`) com histórico/publicação ainda em evolução operacional.
- O PRD em `docs/prd/00-product-prd.md` está como placeholder no repositório.

## Opções realistas no contexto atual

1. Manter admin fora do site publicado (modelo atual evolutivo)
- Operação: edição acontece em ambiente interno/controlado; site público permanece estático.
- Compatibilidade com hospedagem compartilhada: alta.
- Risco de segurança: menor no MVP.

2. Admin embarcado parcial (entrada no site público, mas edição delegada)
- Operação: página pública oferece apenas atalho/control plane e redireciona para ambiente interno.
- Compatibilidade com SEO/build estático: alta.
- Ganho operacional: moderado; não entrega edição in-place real.

3. Admin embarcado completo no site do cliente (edição in-place)
- Operação: exige autenticação robusta, endpoint de escrita exposto, trilha de auditoria, proteção CSRF/session, hardening e estratégia de publicação/versionamento.
- Compatibilidade com hospedagem compartilhada e stack atual: baixa no MVP.
- Risco de segurança e regressão de SEO: alto.

## Trade-offs principais

- SEO: manter o site público estático reduz risco; edição in-place tende a pressionar arquitetura para runtime dinâmico.
- Persistência: modelo file-based atual atende operação interna; admin embarcado completo exigiria controles adicionais de concorrência, auditoria e rollback.
- Segurança: hoje não há base de autenticação/autorizações de produção para expor edição no domínio público.
- Complexidade: admin embarcado completo compete com prioridades operacionais já abertas (qualidade de validação, maturidade de publicação e histórico).

## Recomendação final

**Adiar admin embarcado completo no MVP.**

Direção recomendada para agora:
- seguir com operação interna (Studio/API shell) e publicação por artefato;
- no máximo, considerar um acesso indireto (atalho) sem edição in-place no site público.

Condição mínima para reavaliar em card futuro:
- autenticação/autorização de produção definidas;
- modelo de auditoria e rollback explícitos;
- fronteira clara entre domínio público e superfície administrativa;
- validação de impacto SEO aprovada.

## Limitações do parecer

- Assunção / validar no código: o requisito detalhado de produto para “admin embarcado” não está materializado no PRD local (arquivo placeholder), então a recomendação foi ancorada nos cards, arquitetura atual e guardrails vigentes.
