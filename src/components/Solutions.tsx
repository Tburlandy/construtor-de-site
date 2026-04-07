import { Building2, Factory, Home, Truck, Zap } from 'lucide-react';
import { Card } from './ui/card';
import installationImage from '@/assets/installation-work.jpg';
import industrialImage from '@/assets/industrial-panels.jpg';

export const Solutions = () => {
  const solutions = [
    {
      icon: Home,
      title: '☀️ Residencial',
      description: 'Painéis solares de 3 a 12 kWp para residências',
      features: ['Inversores string', '25 anos de garantia nas placas', '60-90 dias para instalação', 'ART + homologação ANEEL'],
    },
    {
      icon: Building2,
      title: '🏢 Comercial',
      description: 'Usinas solares de 10 a 100 kWp para empresas',
      features: ['Inversores híbridos', 'Monitoramento 24/7', '90-120 dias para instalação', 'Engenharia completa'],
    },
    {
      icon: Factory,
      title: '🏭 Industrial',
      description: 'Grandes usinas fotovoltaicas acima de 100 kWp',
      features: ['Inversores centrais', 'Alta eficiência', '120-180 dias para instalação', 'Suporte técnico dedicado'],
    },
    {
      icon: Truck,
      title: '🚜 Rural / Off-grid',
      description: 'Sistemas solares isolados com baterias',
      features: ['Autonomia total', 'Baterias de lítio', 'Backup garantido', 'Sem dependência da rede'],
    },
  ];

  return (
    <section id="solucoes" className="hidden py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            ☀️ Painéis Solares para{' '}
            <span className="bg-text-gradient bg-clip-text text-transparent">
              cada necessidade
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sistemas fotovoltaicos personalizados com engenharia própria e equipamentos premium
          </p>
        </div>

        {/* Featured Images */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden h-64">
            <img 
              src={installationImage} 
              alt="Instalação profissional de painéis solares"
              className="w-full h-full object-cover"
              width="800"
              height="400"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-6">
              <p className="text-sm font-medium">Instalação profissional certificada</p>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-64">
            <img 
              src={industrialImage} 
              alt="Grande usina solar fotovoltaica industrial"
              className="w-full h-full object-cover"
              width="800"
              height="400"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-6">
              <p className="text-sm font-medium">Projetos de grande porte</p>
            </div>
          </div>
        </div>

        {/* Solutions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.map((solution) => (
            <Card key={solution.title} className="p-6 bg-card-gradient border-border hover:border-primary/50 transition-all hover:shadow-card">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <solution.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{solution.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{solution.description}</p>
              <ul className="space-y-2">
                {solution.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
