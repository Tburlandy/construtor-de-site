// GTM & DataLayer utilities
declare global {
  interface Window {
    dataLayer: any[];
  }
}

export const pushGTMEvent = (event: string, data?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event,
      ...data,
    });
  }
};

export const trackCTAPopupOpen = (placement: string) => {
  pushGTMEvent('cta_popup_open', { placement });
};

export const trackLeadSubmit = (origin: string) => {
  pushGTMEvent('lead_submit', { origin });
};

export const trackCalculatorResult = (kwp: number, economy: number, payback_min: number, payback_max: number) => {
  pushGTMEvent('calculator_result', { kwp, economy, payback_min, payback_max });
};

export const trackThankYouView = () => {
  pushGTMEvent('thankyou_view', {});
};
