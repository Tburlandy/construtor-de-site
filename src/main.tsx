import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import contentJson from "../content/content.json";

declare global {
  interface Window {
    __GTM_ID__?: string;
    dataLayer: any[];
  }
}

const GTM_FALLBACK_ID = "GTM-XXXXXXX";
const GTM_FETCH_TIMEOUT_MS = 1800;
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Elemento raiz "#root" não encontrado.');
}

createRoot(rootElement).render(<App />);

function getContentApiCandidates(): string[] {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const candidates = [
    "/api/content",
    `${normalizedBase}/api/content`,
  ];
  return [...new Set(candidates)];
}

function getGtmIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeGlobal = (payload as { global?: unknown }).global;
  if (!maybeGlobal || typeof maybeGlobal !== "object") {
    return null;
  }

  const maybeGtmId = (maybeGlobal as { gtmId?: unknown }).gtmId;
  if (typeof maybeGtmId !== "string") {
    return null;
  }

  const trimmed = maybeGtmId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getGtmIdFromStaticContent(): string | null {
  return getGtmIdFromPayload(contentJson);
}

async function tryReadGtmIdFromEndpoint(endpoint: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GTM_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    return getGtmIdFromPayload(payload);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function resolveGtmId(): Promise<string> {
  const envGtm = import.meta.env.VITE_GTM_ID?.trim();
  if (envGtm) {
    return envGtm;
  }

  const staticGtm = getGtmIdFromStaticContent();
  if (staticGtm) {
    return staticGtm;
  }

  const shouldTryApi = __STUDIO_ENABLED__;
  if (!shouldTryApi) {
    return GTM_FALLBACK_ID;
  }

  for (const endpoint of getContentApiCandidates()) {
    const endpointGtmId = await tryReadGtmIdFromEndpoint(endpoint);
    if (endpointGtmId) {
      return endpointGtmId;
    }
  }
  return GTM_FALLBACK_ID;
}

function injectGtm(gtmId: string) {
  if (!gtmId || gtmId === GTM_FALLBACK_ID) {
    return;
  }

  const existingScript = document.querySelector(`script[data-gtm-id="${gtmId}"]`);
  if (existingScript) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  script.dataset.gtmId = gtmId;
  document.head.appendChild(script);

  if (!document.querySelector(`iframe[data-gtm-noscript="${gtmId}"]`)) {
    const noscript = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    iframe.dataset.gtmNoscript = gtmId;
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }
}

void (async () => {
  const gtmId = await resolveGtmId();
  window.__GTM_ID__ = gtmId;
  injectGtm(gtmId);
})();
