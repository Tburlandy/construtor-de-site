import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, CircleDollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import type { Content } from '@/content/schema';

interface FinancingProps {
  onOpenPopup?: () => void;
}

export const Financing = ({ onOpenPopup }: FinancingProps) => {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    fetchContent().then(setContent);
  }, []);

  const financing = content?.financing;
  const badge = financing?.badge ?? 'Pagamento Facilitado';
  const titlePrefix = financing?.titlePrefix ?? 'Comece a pagar em';
  const titleHighlight = financing?.titleHighlight ?? 'abril de 2026';
  const subtitle = financing?.subtitle ?? 'Em até 120 vezes, com 1º pagamento em 120 dias';
  const ctaLabel = financing?.ctaLabel ?? 'Orçamento gratuito';
  const items =
    financing?.items?.length
      ? financing.items
      : [
          { title: '120 dias para começar', description: 'Você só começa a pagar em 4 meses' },
          { title: 'Até 120 parcelas', description: 'Parcelas que cabem no seu bolso com taxas reduzidas' },
          { title: 'Zero de entrada', description: 'Comece a economizar sem desembolso inicial' },
        ];

  return (
    <section id="forma-pagamento" className="py-20 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{badge}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {titlePrefix}{' '}
              <span className="text-primary">{titleHighlight}</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">{subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{items[0]?.title}</h3>
              <p className="text-sm text-muted-foreground">{items[0]?.description}</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{items[1]?.title}</h3>
              <p className="text-sm text-muted-foreground">{items[1]?.description}</p>
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CircleDollarSign className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{items[2]?.title}</h3>
              <p className="text-sm text-muted-foreground">{items[2]?.description}</p>
            </div>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-elegant text-sm md:text-base px-6 md:px-8 py-5 md:py-6 btn-press"
              onClick={onOpenPopup}
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
