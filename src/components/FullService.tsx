import { Button } from '@/components/ui/button';
import { CheckCircle2, FileCheck, Headphones, Wrench } from 'lucide-react';
import solarPanelsImage from '@/assets/solar-panels-angle.png';
import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import type { Content } from '@/content/schema';
import { normalizeCoverImageLayout } from '@/lib/imageLayout';

interface FullServiceProps {
  onOpenPopup?: () => void;
}

export const FullService = ({ onOpenPopup }: FullServiceProps) => {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    fetchContent().then(setContent);
  }, []);

  const panelsImage = content?.fullService?.image || solarPanelsImage;
  const panelsImageLayout = normalizeCoverImageLayout(content?.imageLayout?.fullService);
  const services = content?.fullService?.services?.length
    ? content.fullService.services
    : content?.benefits?.length
      ? content.benefits.map((benefit) => ({
          title: benefit.title,
          description: benefit.text,
        }))
      : [
          { title: 'Projeto Completo', description: 'Dimensionamento técnico e análise de viabilidade' },
          { title: 'Instalação Profissional', description: 'Equipe certificada com NR10 e NR35' },
          { title: 'Homologação ANEEL', description: 'Cuidamos de toda a documentação e aprovação' },
          { title: 'Suporte Completo', description: 'Atendimento local e monitoramento contínuo' },
        ];
  const serviceIcons = [FileCheck, Wrench, CheckCircle2, Headphones];

  return (
    <section id="cuidamos-tudo" className="py-20 bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image side */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
              <div className="relative z-10 overflow-hidden rounded-3xl">
                <img 
                  src={panelsImage.startsWith('/') || panelsImage.startsWith('http') ? panelsImage : solarPanelsImage} 
                  alt={content?.fullService?.imageAlt || 'Painéis solares fotovoltaicos de alta qualidade'} 
                  className="aspect-[4/3] w-full h-full object-cover drop-shadow-2xl"
                  style={{
                    objectPosition: `${panelsImageLayout.x}% ${panelsImageLayout.y}%`,
                    transformOrigin: `${panelsImageLayout.x}% ${panelsImageLayout.y}%`,
                    transform: `scale(${panelsImageLayout.scale})`,
                  }}
                  width="800"
                  height="600"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            {/* Content side */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {content?.fullService?.badge || 'Serviço Completo'}
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                {content?.fullService?.titlePrefix || 'Cuidamos de'}{' '}
                <span className="text-primary">{content?.fullService?.titleHighlight || 'tudo para você'}</span>
              </h2>

              <p className="text-lg text-muted-foreground mb-8">
                {content?.fullService?.description ||
                  'Do projeto à instalação, com homologação garantida e suporte completo. Atendimento personalizado em todas as etapas do seu sistema solar.'}
              </p>

              <div className="space-y-4 mb-8">
                {services.map(({ title, description }, index) => {
                  const Icon = serviceIcons[index] || CheckCircle2;
                  return (
                  <div key={title} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{title}</h3>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  );
                })}
              </div>

              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto border-[#25D366] hover:bg-[#25D366]/10 hover:text-white text-sm md:text-base px-6 md:px-8 py-5 md:py-6 btn-press"
                onClick={onOpenPopup}
              >
                <svg className="mr-2 w-4 h-4 md:w-5 md:h-5" fill="#25D366" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {content?.fullService?.ctaLabel || 'Fale no Whatsapp'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
