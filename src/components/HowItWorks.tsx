import { Sun, Zap, Home, TrendingDown, ArrowLeftRight } from 'lucide-react';
import solarDiagram from '@/assets/solar-system-diagram.jpg';
import { RevealOnScroll } from './RevealOnScroll';
import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import type { Content } from '@/content/schema';

export const HowItWorks = () => {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    fetchContent().then(setContent);
  }, []);

  const diagramImage = content?.howItWorks?.image || solarDiagram;
  const steps = [
    {
      icon: Sun,
      number: '01',
      title: 'Captação Solar',
      description: 'Os painéis fotovoltaicos captam a energia solar e a transformam em corrente elétrica contínua (DC)',
    },
    {
      icon: Zap,
      number: '02',
      title: 'Conversão',
      description: 'A corrente é enviada aos inversores que transformam a corrente contínua em corrente alternada (AC), a mesma fornecida pelas concessionárias.',
    },
    {
      icon: Home,
      number: '03',
      title: 'Distribuição',
      description: 'Os inversores enviam a corrente alternada para o painel central elétrico que alimenta os equipamentos elétricos da instalação.',
    },
    {
      icon: ArrowLeftRight,
      number: '04',
      title: 'Excedente',
      description: 'O excedente de energia produzido é devolvido à rede elétrica local.',
    },
    {
      icon: TrendingDown,
      number: '05',
      title: 'Economia',
      description: 'A inserção de energia na rede causa a regressão do relógio medidor gerando uma redução do valor da conta de luz.',
    },
  ];

  return (
    <section id="como-funciona" className="py-12 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Como{' '}
              <span className="bg-text-gradient bg-clip-text text-transparent">
                funciona
              </span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Entenda o processo de geração da energia solar fotovoltaica
            </p>
          </div>
        </RevealOnScroll>

        {/* Diagram Image */}
        <RevealOnScroll animation="scale-in" delay={100}>
          <div className="max-w-5xl mx-auto mb-12 md:mb-16 px-2">
            <img 
              src={diagramImage.startsWith('/') || diagramImage.startsWith('http') ? diagramImage : solarDiagram} 
              alt="Diagrama do sistema de energia solar fotovoltaica"
              className="w-full h-auto rounded-xl md:rounded-2xl shadow-lg"
              width="1200"
              height="800"
              loading="lazy"
              decoding="async"
            />
          </div>
        </RevealOnScroll>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {steps.map((step, idx) => (
            <RevealOnScroll key={step.number} delay={idx * 100}>
              <div className="relative">
              {/* Number Badge */}
              <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center z-10">
                <span className="text-xs md:text-sm font-bold text-primary">{step.number}</span>
              </div>
              
              {/* Card Content */}
              <div className="bg-card rounded-xl md:rounded-2xl p-5 md:p-6 pt-7 md:pt-8 border border-border h-full flex flex-col card-hover">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 flex-shrink-0">
                  <step.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 flex-shrink-0">{step.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed flex-grow">{step.description}</p>
              </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
