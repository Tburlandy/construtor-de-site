// Tracking e UTM utilities

export const getUrlParams = () => {
  if (typeof window === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(window.location.search));
};

export const persistUtm = () => {
  if (typeof window === 'undefined') return {};
  
  const p = getUrlParams();
  const keys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'gbraid',
    'wbraid',
    'matchType',
    'keyword',
    'adId',
    'CampanhaID',
    'GrupoID',
    'Extensão',
    'CorrespondenciaPalavra',
    'Dispositivo',
    'Anuncio',
    'PalavraChave',
  ];

  const saved = JSON.parse(localStorage.getItem('utm_payload') || '{}');
  const now = keys.reduce((acc, k) => {
    if (p[k]) acc[k] = p[k];
    return acc;
  }, {} as Record<string, string>);

  const merged = { ...saved, ...now };
  localStorage.setItem('utm_payload', JSON.stringify(merged));
  return merged;
};

export const getUtmPayload = () => {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('utm_payload') || '{}');
};

export const getDevice = () => {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth <= 768 ? 'mobile' : 'desktop';
};

export const nowLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // Formato DD/MM/YYYY para Data (padrão Elementor)
  const dataDDMMYYYY = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  // Formato HH:mm para Horário
  const horaHHmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    data: dataDDMMYYYY,
    horario: horaHHmm,
  };
};

