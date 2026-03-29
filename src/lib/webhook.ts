// Webhook submission utilities

export interface LeadData {
  // Visible fields
  nome: string;
  telefone: string;
  email?: string;
  segmento: string;
  conta_rs?: string;
  kwh_mensal?: string;
  cep?: string;
  tipo_telhado?: string;
  mensagem?: string;
  
  // Hidden UTM & tracking fields
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  device?: string;
  matchType?: string;
  keyword?: string;
  adId?: string;
  referrer?: string;
  page_variant?: string;
  city_detected?: string;
  form_origin: 'principal' | 'popup' | 'calculator';
  data: string;
  hora: string;
  timezone: string;
}

export const submitLead = async (data: LeadData): Promise<boolean> => {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
  
  if (!webhookUrl || webhookUrl.includes('[[')) {
    console.warn('Webhook URL not configured');
    return false;
  }
  
  try {
    // Convert to x-www-form-urlencoded
    const formBody = Object.entries(data)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Webhook submission failed:', error);
    
    // Retry once
    try {
      const formBody = Object.entries(data)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });
      
      return response.ok;
    } catch (retryError) {
      console.error('Webhook retry failed:', retryError);
      return false;
    }
  }
};

export const getUTMParams = (): Partial<LeadData> => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get('utm_source') || localStorage.getItem('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || localStorage.getItem('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || localStorage.getItem('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || localStorage.getItem('utm_term') || undefined,
    utm_content: params.get('utm_content') || localStorage.getItem('utm_content') || undefined,
    gclid: params.get('gclid') || localStorage.getItem('gclid') || undefined,
    gbraid: params.get('gbraid') || localStorage.getItem('gbraid') || undefined,
    wbraid: params.get('wbraid') || localStorage.getItem('wbraid') || undefined,
    referrer: document.referrer || undefined,
    device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  };
};

export const storeUTMParams = () => {
  if (typeof window === 'undefined') return;
  
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  
  utmKeys.forEach(key => {
    const value = params.get(key);
    if (value) {
      localStorage.setItem(key, value);
    }
  });
};

export const sanitizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  const country = import.meta.env.VITE_WHATS_COUNTRY || '55';
  
  if (digits.length === 10 || digits.length === 11) {
    return `${country}${digits}`;
  }
  
  return digits;
};

export const formatWhatsAppMessage = (nome: string, segmento: string): string => {
  return `Olá, sou ${nome} e preciso de ajuda com energia solar (${segmento}). Vim pelo Google.`;
};
