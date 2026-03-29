import { Star, Shield, Clock, Award, CheckCircle2, Users } from 'lucide-react';
import googleReviewsImage from '@/assets/google-reviews.png';
import { RevealOnScroll } from './RevealOnScroll';
import { Button } from './ui/button';
import { trackCTAPopupOpen } from '@/lib/gtm';
import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import type { Content } from '@/content/schema';

interface ProofBarProps {
  onOpenPopup: () => void;
}

export const ProofBar = ({ onOpenPopup }: ProofBarProps) => {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    fetchContent().then(setContent);
  }, []);

  const reviewsImage = content?.proofBar?.image || googleReviewsImage;
  const benefits = [
    {
      icon: Star,
      title: '100% de satisfação no Google',
      description: 'São 409 avaliações, não são 10, 20! 409 clientes fizeram questão de comentar a experiência 5 estrelas.',
    },
    {
      icon: Shield,
      title: 'Garantia de 25 anos das placas solares',
      description: 'Proteção do seu investimento',
    },
    {
      icon: Clock,
      title: 'Instalação Rápida',
      description: 'Em poucos dias você terá seu sistema funcionando',
    },
    {
      icon: Award,
      title: `Líder em painéis solares em ${content?.global.city || 'São Gonçalo e Niterói'}`,
      description: 'Referência em qualidade e atendimento',
    },
    {
      icon: CheckCircle2,
      title: 'Satisfação Garantida',
      description: 'Garantimos o sistema em plena operação',
    },
    {
      icon: Users,
      title: '+ DE 1000',
      description: 'Clientes atendidos com excelência',
    },
  ];

  return (
    <section id="sobre-nos" className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-8 md:mb-12 text-left">
            Escolha a empresa{' '}
            <span className="text-primary">mais bem avaliada</span>{' '}
            do Rio de Janeiro e não tenha dor de cabeça
          </h2>
        </RevealOnScroll>

        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Content side */}
          <RevealOnScroll animation="slide-in-left" delay={100}>
            <div>
              <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8">
                <strong>SOMOS</strong> a empresa com o maior número de avaliação 5 estrelas 
                no estado do Rio de Janeiro, com equipe de Engenharia e Instalação certificada 
                e especializada. Equipe própria, nada de tercerizados. Receba tudo 100% funcionando - 
                Resolvemos toda a burocracia
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {benefits.map(({ icon: Icon, title, description }, idx) => (
                  <RevealOnScroll key={title} delay={200 + idx * 100}>
                    <div className="flex gap-3 items-start card-hover p-4 rounded-lg bg-card/50 transition-all duration-300">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">{title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                      </div>
                    </div>
                  </RevealOnScroll>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mt-8 md:mt-10">
                <Button 
                  onClick={() => {
                    trackCTAPopupOpen('proofbar');
                    onOpenPopup();
                  }}
                  size="lg"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-elegant text-sm md:text-base px-6 md:px-8 py-5 md:py-6 btn-press"
                >
                  Orçamento gratuito
                </Button>
                <Button 
                  onClick={() => {
                    trackCTAPopupOpen('proofbar');
                    onOpenPopup();
                  }}
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-[#25D366] hover:bg-[#25D366]/10 hover:text-white text-sm md:text-base px-6 md:px-8 py-5 md:py-6 btn-press"
                >
                  <svg className="mr-2 w-4 h-4 md:w-5 md:h-5" fill="#25D366" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Fale no Whatsapp
                </Button>
              </div>
            </div>
          </RevealOnScroll>

            {/* Google Reviews Image */}
            <RevealOnScroll animation="slide-in-right" delay={100}>
              <div className="relative group order-first lg:order-last">
                {/* Glow effect */}
                <div className="absolute -inset-2 bg-primary/20 rounded-3xl blur-xl group-hover:bg-primary/30 transition duration-500" />
                
                {/* Image container */}
                <div className="relative">
                  <img 
                    src={reviewsImage.startsWith('/') || reviewsImage.startsWith('http') ? reviewsImage : googleReviewsImage} 
                    alt="5.0 estrelas - 409 avaliações no Google" 
                    className="relative z-10 w-full h-auto rounded-2xl shadow-elegant hover:scale-[1.02] transition-transform duration-500"
                    width="600"
                    height="400"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
};
