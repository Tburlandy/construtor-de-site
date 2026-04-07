# F5-002 — Add FTP/SFTP connection test

## Objetivo

Implementar um teste mínimo de conexão para o destino configurado, sem ainda executar publicação completa.

## Contexto

O PRD exige integração com hospedagem compartilhada. O passo seguro antes do publish é validar conexão.

## Por que essa task existe

Reduz risco operacional e evita publicar diretamente sem saber se o destino está acessível.

## Arquivos que devem ser lidos antes

- artefatos de `F5-001`
- documentação do PRD sobre publicação
- regras de validação

## Arquivos que podem ser alterados

- módulos server-side relacionados a deploy
- UI mínima ou endpoint mínimo para acionar teste
- contratos ligados ao resultado do teste

## Arquivos que não devem ser alterados

- build/export
- histórico/versionamento amplo
- Studio

## Escopo do que entra

- teste mínimo de conexão
- retorno claro de sucesso/erro
- log básico suficiente para operação

## Non-goals / o que não entra

- upload de arquivos
- rollback
- sincronização completa de diretórios

## Passos sugeridos

1. implementar rotina de teste
2. expor endpoint/ação mínima
3. tratar erros de forma clara
4. não avançar para publish

## Critérios de aceite

- é possível testar conexão para um destino configurado
- erros são reportados de forma operacional
- o card não implementa publish completo

## Validações obrigatórias

```bash
npm run lint
npm run build
```

Além disso:

- registrar o que não pôde ser validado localmente

## Riscos

- introduzir dependência técnica sem evidência suficiente
- acoplar teste e publicação no mesmo card

## Dependências

F5-001

## Definição de pronto

Pronto quando houver um teste mínimo de conexão utilizável antes do publish.

## Instrução final de entrega para o agente

Ao concluir, responda com:

- como o teste funciona;
- arquivos alterados;
- validações executadas;
- limitações;
- o que falta para publicação.
