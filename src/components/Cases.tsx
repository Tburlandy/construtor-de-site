import { Home, Building } from 'lucide-react';
import { Card } from './ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import { RevealOnScroll } from './RevealOnScroll';
import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import type { Content } from '@/content/schema';
import { normalizeCoverImageLayout } from '@/lib/imageLayout';
import caseBarra from '@/assets/case-barra-tijuca.png';
import caseRioOuro from '@/assets/case-rio-ouro.png';
import caseSaoGoncalo from '@/assets/case-sao-goncalo.png';
import caseDuqueCaxias from '@/assets/case-duque-caxias.png';
import caseMariaPaula from '@/assets/case-maria-paula.png';
import caseVeterinario from '@/assets/case-veterinario.png';
import caseSaoGoncalo2 from '@/assets/case-sao-goncalo-2.png';

export const Cases = () => {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    fetchContent().then(setContent);
  }, []);

  // Usa projetos do content.json se disponíveis, senão usa fallback
  const projects = content?.showcase.projects || [];
  const defaultCases = [
    { image: caseBarra, tipo: 'Residencial', icon: Home, bairro: 'Barra da Tijuca', kwp: 8.54, modulos: 16, potenciaModulo: 550, economia: 14500, imageLayout: undefined },
    { image: caseRioOuro, tipo: 'Residencial', icon: Home, bairro: 'Rio do Ouro', kwp: 9.36, modulos: 17, potenciaModulo: 550, economia: 11793, imageLayout: undefined },
    { image: caseSaoGoncalo, tipo: 'Residencial', icon: Home, bairro: 'São Gonçalo', kwp: 4.56, modulos: 8, potenciaModulo: 570, economia: 6000, imageLayout: undefined },
    { image: caseDuqueCaxias, tipo: 'Comercial', icon: Building, bairro: 'Duque de Caxias - RJ', kwp: 13.68, modulos: 25, potenciaModulo: 550, economia: 18000, imageLayout: undefined },
    { image: caseMariaPaula, tipo: 'Residencial', icon: Home, bairro: 'Maria Paula - Niterói', kwp: 4.56, modulos: 8, potenciaModulo: 570, economia: 6000, imageLayout: undefined },
    { image: caseVeterinario, tipo: 'Comercial', icon: Building, bairro: 'Niterói - RJ', kwp: 40.7, modulos: 74, potenciaModulo: 550, economia: 55000, imageLayout: undefined },
    { image: caseSaoGoncalo2, tipo: 'Comercial', icon: Building, bairro: 'São Gonçalo - RJ', kwp: 31.23, modulos: 57, potenciaModulo: 550, economia: 67108, imageLayout: undefined },
  ];

  // Converte projetos do content.json para o formato esperado
  const cases = projects.length > 0
    ? projects.map((project) => ({
        image: project.image,
        tipo: project.tipo,
        icon: project.tipo === 'Residencial' ? Home : Building,
        bairro: project.localizacao,
        kwp: 0,
        modulos: project.modulos,
        potenciaModulo: project.potenciaModulo,
        economia: project.economia,
        imageLayout: project.imageLayout,
      }))
    : defaultCases;
  const showcaseTitleHighlight = content?.showcase.titleHighlight || '+ 1000';
  const showcaseTitleSuffix = content?.showcase.titleSuffix || 'projetos realizados';
  const showcaseSubtitle =
    content?.showcase.subtitle || 'Projetos reais implementados com resultados comprovados';
  const showcaseLabels = content?.showcase.labels ?? {
    location: 'Localização',
    system: 'Sistema',
    annualSavings: 'Economia anual',
  };

  return (
    <section id="casos" className="py-12 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <RevealOnScroll>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              <span className="bg-text-gradient bg-clip-text text-transparent">{showcaseTitleHighlight}</span>{' '}
              {showcaseTitleSuffix}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              {showcaseSubtitle}
            </p>
          </div>
        </RevealOnScroll>

        {/* Cases Carousel */}
        <RevealOnScroll delay={200}>
          <div className="max-w-7xl mx-auto">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {cases.map((caseItem, index) => {
                const caseImageLayout = normalizeCoverImageLayout(caseItem.imageLayout);
                return (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-[90%] sm:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden bg-card-gradient border-border hover:border-primary/50 transition-all card-hover">
                    {/* Image */}
                    <div className="relative h-48 md:h-64 overflow-hidden">
                      <img
                        src={typeof caseItem.image === 'string' && (caseItem.image.startsWith('/') || caseItem.image.startsWith('http')) ? caseItem.image : caseItem.image}
                        alt={`Projeto ${caseItem.tipo} em ${caseItem.bairro}`}
                        className="w-full h-full object-cover transition-transform duration-500"
                        style={{
                          objectPosition: `${caseImageLayout.x}% ${caseImageLayout.y}%`,
                          transformOrigin: `${caseImageLayout.x}% ${caseImageLayout.y}%`,
                          transform: `scale(${caseImageLayout.scale})`,
                        }}
                        width="400"
                        height="300"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (typeof caseItem.image === 'string' && !caseItem.image.startsWith('/')) {
                            target.src = `/${caseItem.image}`;
                          }
                        }}
                      />
                    </div>

                    {/* Card Content */}
                    <div className="p-6 space-y-3">
                      {/* Tipo com ícone */}
                      <div className="flex items-center gap-2 mb-4">
                        <caseItem.icon className="w-5 h-5 text-primary" />
                        <span className="text-lg font-bold">{caseItem.tipo}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">{showcaseLabels.location}</span>
                        <span className="font-semibold">{caseItem.bairro}</span>
                      </div>

                      {caseItem.modulos > 0 && (
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <span className="text-sm text-muted-foreground">{showcaseLabels.system}</span>
                          <span className="font-semibold text-primary">{caseItem.modulos} módulos {caseItem.potenciaModulo}W</span>
                        </div>
                      )}

                      {caseItem.economia > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{showcaseLabels.annualSavings}</span>
                          <span className="font-semibold text-primary">
                            R$ {caseItem.economia.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </CarouselItem>
                );
              })}
            </CarouselContent>

            {/* Navigation Arrows */}
            <CarouselPrevious className="left-0 -translate-x-12" />
            <CarouselNext className="right-0 translate-x-12" />
          </Carousel>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
