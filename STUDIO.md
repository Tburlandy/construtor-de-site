# Studio - Sistema de Edição de Conteúdo

Sistema de edição de conteúdo dinâmico para o site de energia solar.

## Como Usar

### 1. Acessar o Studio

Acesse `/dev/studio` no navegador. Você precisará da senha configurada em `.env`:

```
VITE_STUDIO_PASS="sua-senha-aqui"
```

### 2. Editar Conteúdo

O Studio possui 7 abas:

- **Variáveis Globais**: Marca, cidade, WhatsApp
- **SEO**: Título, descrição, meta tags, JSON-LD
- **Hero**: Título principal, subtítulo, CTA, imagem de fundo
- **Benefícios**: Lista de benefícios do serviço
- **Projetos**: Galeria de imagens de projetos
- **Especialista**: Foto, nome e bio do especialista
- **Depoimentos**: Testemunhos de clientes (com suporte a vídeo)

### 3. Variáveis Dinâmicas

Use `{{city}}`, `{{brand}}` ou `{{whatsappE164}}` nos textos para substituição automática.

Exemplo:
- Headline: `⚡ Líder em painéis solares em {{city}}`
- Será renderizado como: `⚡ Líder em painéis solares em Niterói - RJ`

### 4. Upload de Arquivos

- **Imagens**: Convertidas automaticamente para WebP com variações de tamanho (768px, 1280px, 1920px)
- **Vídeos**: Suporta MP4 e WebM (poster gerado automaticamente)

### 5. Salvar Alterações

Clique em "Salvar" no topo da página. As alterações são salvas em `/content/content.json` e refletem imediatamente no site (sem rebuild necessário).

## Estrutura de Arquivos

```
/content
  content.json          # Arquivo de conteúdo (fonte de verdade)

/src
  /content
    schema.ts           # Schema Zod para validação
  /seo
    SEO.tsx            # Componente de SEO dinâmico
  /lib
    content.ts         # Utilitários para ler conteúdo
  /pages
    Studio.tsx         # Interface do Studio
  /components
    StudioGuard.tsx    # Autenticação do Studio

vite-plugin-studio.ts  # Plugin Vite para API do Studio
```

## API Endpoints

- `GET /api/content` - Retorna conteúdo atual
- `PUT /api/content` - Salva conteúdo (valida com Zod)
- `POST /api/upload-image` - Upload de imagem (retorna URL WebP)
- `POST /api/upload-video` - Upload de vídeo (retorna URL + poster)

## Variáveis de Ambiente

Configure no `.env`:

```env
VITE_BRAND_NAME="EFITEC SOLAR"
VITE_CITY="Niterói - RJ"
VITE_WPP_E164="5521999999999"
VITE_GTM_ID="GTM-XXXXXXX"
VITE_WEBHOOK_URL="https://seu-webhook"
VITE_STUDIO_PASS="troque-isto"
```

## Notas Importantes

1. O conteúdo é lido em runtime (sem rebuild necessário)
2. As imagens são otimizadas automaticamente para WebP
3. O sistema valida todo conteúdo com Zod antes de salvar
4. A senha do Studio é armazenada em sessionStorage (não persiste entre sessões)
5. Em produção, certifique-se de que `/content/content.json` seja servido corretamente

