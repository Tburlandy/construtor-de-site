import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import type { Content } from '@/content/schema';
import { bootstrapRuntimeContent, setContentRuntimeOverride } from '@/lib/content';

declare global {
  interface Window {
    __GTM_ID__?: string;
  }
}

const GTM_FALLBACK_ID = 'GTM-XXXXXXX';
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz "#root" não encontrado.');
}

function getGtmIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeGlobal = (payload as { global?: unknown }).global;
  if (!maybeGlobal || typeof maybeGlobal !== 'object') {
    return null;
  }

  const maybeGtmId = (maybeGlobal as { gtmId?: unknown }).gtmId;
  if (typeof maybeGtmId !== 'string') {
    return null;
  }

  const trimmed = maybeGtmId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createMinimalFallbackContent(): Content {
  const brand = import.meta.env.VITE_BRAND_NAME || 'EFITEC SOLAR';
  const city = import.meta.env.VITE_CITY || 'Rio de Janeiro - RJ';
  const whatsappE164 = import.meta.env.VITE_WPP_E164 || '5521999999999';
  const siteUrl =
    import.meta.env.VITE_PROJECT_DOMAIN ||
    import.meta.env.VITE_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://www.efitecsolar.com');

  return {
    global: {
      brand,
      city,
      whatsappE164,
      cnpj: '00.000.000/0001-00',
      address: 'Endereço indisponível',
      siteUrl,
      gtmId: '',
    },
    seo: {
      title: brand,
      description: `${brand} em ${city}`,
      canonical: siteUrl,
      ogImage: '/favicon.ico',
      jsonLd: {},
    },
    hero: {
      headline: brand,
      subheadline: 'Conteúdo temporariamente indisponível.',
      ctaLabel: 'Solicitar orçamento',
      background: '/hero-solar-panels.jpg',
    },
    benefits: [],
    showcase: {
      projects: [],
    },
  };
}

function injectGtm(gtmId: string) {
  if (!gtmId || gtmId === GTM_FALLBACK_ID) {
    return;
  }

  const existingScript = document.querySelector(`script[data-gtm-id="${gtmId}"]`);
  if (existingScript) {
    return;
  }

  const analyticsWindow = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
  };
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
  analyticsWindow.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  script.dataset.gtmId = gtmId;
  document.head.appendChild(script);

  if (!document.querySelector(`iframe[data-gtm-noscript="${gtmId}"]`)) {
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    iframe.dataset.gtmNoscript = gtmId;
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }
}

async function bootstrapApplication() {
  let gtmId = import.meta.env.VITE_GTM_ID?.trim() || '';

  try {
    const content = await bootstrapRuntimeContent();
    gtmId = gtmId || getGtmIdFromPayload(content) || '';
  } catch (error) {
    console.error('[app-bootstrap] Falha ao inicializar conteúdo em runtime:', error);
    setContentRuntimeOverride(createMinimalFallbackContent());
  }

  if (!gtmId) {
    gtmId = GTM_FALLBACK_ID;
  }

  window.__GTM_ID__ = gtmId;
  injectGtm(gtmId);
  createRoot(rootElement).render(<App />);
}

void bootstrapApplication();
