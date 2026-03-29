import { useState } from 'react';
import { Calculator as CalcIcon, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { calculateSolarSystem, formatCurrency, formatNumber } from '@/lib/calculator';
import { trackCalculatorResult, trackCTAPopupOpen } from '@/lib/gtm';
import { RevealOnScroll } from './RevealOnScroll';

interface CalculatorProps {
  onOpenPopup: (prefilledData?: any) => void;
}

export const Calculator = ({ onOpenPopup }: CalculatorProps) => {
  const [contaRS, setContaRS] = useState('');
  const [segmento, setSegmento] = useState('Residencial');
  const [result, setResult] = useState<ReturnType<typeof calculateSolarSystem> | null>(null);

  const handleCalculate = () => {
    try {
      const conta_rs = parseFloat(contaRS.replace(/[^\d,]/g, '').replace(',', '.'));
      
      if (!conta_rs || conta_rs <= 0) {
        alert('Por favor, informe o valor da sua conta de luz');
        return;
      }

      const calculationResult = calculateSolarSystem({
        conta_rs,
        segmento,
      });

      setResult(calculationResult);
      
      trackCalculatorResult(
        calculationResult.kwp,
        calculationResult.economia_mensal,
        calculationResult.payback_min,
        calculationResult.payback_max
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao calcular');
    }
  };

  const handleGetProposal = () => {
    trackCTAPopupOpen('calculator');
    onOpenPopup({
      conta_rs: contaRS,
      segmento,
    });
  };

  return (
    <section id="calculadora" className="hidden py-12 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <RevealOnScroll>
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Calcule sua{' '}
              <span className="bg-text-gradient bg-clip-text text-transparent">
                economia com painéis solares
              </span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground px-4">
              ☀️ Descubra quanto você pode economizar instalando energia solar fotovoltaica
            </p>
          </div>
        </RevealOnScroll>

          {/* Calculator Card */}
          <RevealOnScroll animation="scale-in" delay={200}>
            <Card className="p-4 sm:p-6 md:p-8 bg-card-gradient border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div>
                <Label htmlFor="conta" className="text-sm">Valor médio da conta de luz (R$)</Label>
                <Input
                  id="conta"
                  type="text"
                  placeholder="Ex: 450,00"
                  value={contaRS}
                  onChange={(e) => setContaRS(e.target.value)}
                  className="mt-2 h-11 sm:h-10"
                />
              </div>

              <div>
                <Label htmlFor="segmento" className="text-sm">Tipo de imóvel</Label>
                <Select value={segmento} onValueChange={setSegmento}>
                  <SelectTrigger className="mt-2 h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residencial">Residencial</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleCalculate}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold btn-press text-sm sm:text-base h-12"
              size="lg"
            >
              <CalcIcon className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
              Calcular sistema ideal
            </Button>

            {/* Results */}
            {result && (
                  <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-border animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
                      <div className="text-center p-4 bg-primary/5 rounded-lg">
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">Sistema recomendado</div>
                        <div className="text-2xl md:text-3xl font-bold text-primary">{formatNumber(result.kwp)} kWp</div>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <div className="text-xs md:text-sm text-muted-foreground mb-1">Economia mensal</div>
                    <div className="text-2xl md:text-3xl font-bold text-primary">{formatCurrency(result.economia_mensal)}</div>
                    <div className="text-xs text-muted-foreground mt-1">~{result.offset_percent}% da conta</div>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <div className="text-xs md:text-sm text-muted-foreground mb-1">Retorno do investimento</div>
                    <div className="text-2xl md:text-3xl font-bold text-primary">
                      {formatNumber(result.payback_min)}-{formatNumber(result.payback_max)} anos
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                  <div className="flex items-start gap-2 md:gap-3">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm">
                      <p className="font-medium text-foreground mb-1">Economia em 25 anos (vida útil dos painéis)</p>
                      <p className="text-muted-foreground">
                        Aproximadamente <span className="font-bold text-primary">{formatCurrency(result.economia_anual * 25)}</span> de economia total
                      </p>
                    </div>
                  </div>
                </div>

                  <Button 
                    onClick={handleGetProposal}
                    size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold btn-press text-sm sm:text-base h-12"
                  >
                    ⚡ Receber site personalizado
                  </Button>

                <p className="text-xs text-muted-foreground text-center mt-3 md:mt-4">
                  * Valores estimados. Configuração final do site depende de análise técnica detalhada.
                </p>
              </div>
            )}
            </Card>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};
