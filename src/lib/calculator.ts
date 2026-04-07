// Solar calculator utilities

export interface CalculatorInput {
  conta_rs?: number;
  kwh_mensal?: number;
  cep?: string;
  tipo_telhado?: string;
  segmento?: string;
}

export interface CalculatorResult {
  kwp: number;
  economia_mensal: number;
  economia_anual: number;
  payback_min: number;
  payback_max: number;
  offset_percent: number;
}

export const calculateSolarSystem = (input: CalculatorInput): CalculatorResult => {
  const defaultTariff = parseFloat(import.meta.env.VITE_DEFAULT_TARIFF || '1.00');
  const defaultHSP = parseFloat(import.meta.env.VITE_DEFAULT_HSP || '4.5');
  
  // Calculate kWh/month
  let kwhMensal = input.kwh_mensal || 0;
  
  if (!kwhMensal && input.conta_rs) {
    kwhMensal = input.conta_rs / defaultTariff;
  }
  
  if (kwhMensal === 0) {
    throw new Error('Informe o valor da conta ou consumo mensal');
  }
  
  // Calculate system size (kWp)
  // Formula: kWp ≈ (kWh/month / 30) / (HSP * efficiency_factor)
  const kwhPerDay = kwhMensal / 30;
  const efficiencyFactor = 0.75; // Account for losses
  const kwp = Math.ceil((kwhPerDay / (defaultHSP * efficiencyFactor)) * 10) / 10;
  
  // Calculate savings (assume 85% offset, range 75-90%)
  const offsetMin = 0.75;
  const offsetMax = 0.90;
  const offsetAvg = 0.85;
  
  const economia_mensal = input.conta_rs ? input.conta_rs * offsetAvg : kwhMensal * defaultTariff * offsetAvg;
  const economia_anual = economia_mensal * 12;
  
  // Estimate system cost (rough: R$ 4,000 - R$ 5,000 per kWp)
  const costPerKwp = input.segmento === 'Industrial' ? 4000 : 
                     input.segmento === 'Comercial' ? 4200 : 4500;
  const systemCost = kwp * costPerKwp;
  
  // Payback calculation
  const payback_avg = systemCost / economia_anual;
  const payback_min = Math.floor(payback_avg * 0.9 * 10) / 10;
  const payback_max = Math.ceil(payback_avg * 1.1 * 10) / 10;
  
  return {
    kwp,
    economia_mensal: Math.round(economia_mensal),
    economia_anual: Math.round(economia_anual),
    payback_min,
    payback_max,
    offset_percent: Math.round(offsetAvg * 100),
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
