import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inicializar GTM antes do render
// Tenta buscar do content.json, senão usa env, senão fallback
(async () => {
  let gtmId = 'GTM-XXXXXXX';
  
  try {
    const response = await fetch('/api/content');
    if (response.ok) {
      const content = await response.json();
      gtmId = content?.global?.gtmId || import.meta.env.VITE_GTM_ID || 'GTM-XXXXXXX';
    } else {
      gtmId = import.meta.env.VITE_GTM_ID || 'GTM-XXXXXXX';
    }
  } catch {
    gtmId = import.meta.env.VITE_GTM_ID || 'GTM-XXXXXXX';
  }
  
  (window as any).__GTM_ID__ = gtmId;
  (window as any).dataLayer = (window as any).dataLayer || [];
  
  // Carregar GTM dinamicamente após definir o ID
  if (gtmId && gtmId !== 'GTM-XXXXXXX') {
    (function(w: any, d: Document, s: string, l: string, i: string) {
      w[l] = w[l] || [];
      w[l].push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js'
      });
      const f = d.getElementsByTagName(s)[0];
      const j = d.createElement(s) as HTMLScriptElement;
      const dl = l !== 'dataLayer' ? '&l=' + l : '';
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode?.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', gtmId);
    
    // Adicionar noscript iframe
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }
  
  createRoot(document.getElementById("root")!).render(<App />);
})();
