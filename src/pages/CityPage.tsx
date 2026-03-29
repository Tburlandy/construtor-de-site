import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { MapPin, Sun, Zap } from 'lucide-react';
import { useState } from 'react';
import { PopupLeadForm } from '@/components/PopupLeadForm';
import { trackCTAPopupOpen } from '@/lib/gtm';
import { getContentSync } from '@/lib/content';

// City data - in production this would come from a CMS or API
const cityData: Record<string, any> = {
  'sao-paulo-sp': {
    name: 'São Paulo',
    state: 'SP',
    concessionaria: 'Enel',
    irradiacao: 4.6,
    cases: [
      { title: 'Residência - Moema', kwp: 8.5, economy: 'R$ 720/mês' },
      { title: 'Comércio - Pinheiros', kwp: 35.0, economy: 'R$ 3.200/mês' },
    ],
  },
  'rio-de-janeiro-rj': {
    name: 'Rio de Janeiro',
    state: 'RJ',
    concessionaria: 'Light',
    irradiacao: 5.2,
    cases: [
      { title: 'Residência - Barra', kwp: 7.2, economy: 'R$ 680/mês' },
    ],
  },
  'belo-horizonte-mg': {
    name: 'Belo Horizonte',
    state: 'MG',
    concessionaria: 'Cemig',
    irradiacao: 4.8,
    cases: [],
  },
  'brasilia-df': {
    name: 'Brasília',
    state: 'DF',
    concessionaria: 'CEB',
    irradiacao: 5.4,
    cases: [],
  },
  'curitiba-pr': {
    name: 'Curitiba',
    state: 'PR',
    concessionaria: 'Copel',
    irradiacao: 4.3,
    cases: [],
  },
  'porto-alegre-rs': {
    name: 'Porto Alegre',
    state: 'RS',
    concessionaria: 'CEEE',
    irradiacao: 4.5,
    cases: [],
  },
};

const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Conteúdo carregado instantaneamente (sem loading)
  const content = getContentSync();

  const city = slug ? cityData[slug] : null;

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Cidade não encontrada</h1>
          <a href="/" className="text-base text-primary hover:underline">Voltar para home</a>
        </div>
      </div>
    );
  }

  const handleOpenPopup = () => {
    trackCTAPopupOpen('city_page');
    setIsPopupOpen(true);
  };

  const wppE164 = content?.global.whatsappE164 || import.meta.env.VITE_WPP_E164 || '5521999999999';
  const siteUrl = content?.global.siteUrl || 'https://www.efitecsolar.com';
  const basePath = import.meta.env.BASE_URL || '/';
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${basePath.replace(/\/$/, '')}`
    : siteUrl;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "EFITEC SOLAR - Energia Solar Fotovoltaica",
    "description": `Instalação de energia solar em ${city.name} - ${city.state} com engenharia própria e marcas Tier-1`,
    "areaServed": {
      "@type": "City",
      "name": city.name,
      "addressRegion": city.state,
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": city.name,
      "addressRegion": city.state,
      "addressCountry": "BR",
    },
    "telephone": `+${wppE164}`,
    "priceRange": "$$",
    "url": baseUrl,
    "image": `${baseUrl}/hero-solar-panels.jpg`
  };

  return (
    <>
      <Helmet>
        <title>Energia Solar em {city.name} - {city.state} | Projeto e Instalação | EFITEC SOLAR</title>
        <meta 
          name="description" 
          content={`Energia solar em ${city.name} - ${city.state} com a ${city.concessionaria}. Projeto, instalação e homologação ANEEL. Irradiação média: ${city.irradiacao} kWh/m²/dia. Engenharia própria e marcas Tier-1. Solicite orçamento gratuito.`}
        />
        <meta 
          name="keywords" 
          content={`energia solar ${city.name}, painéis solares ${city.name}, fotovoltaico ${city.state}, instalação solar ${city.name}, ${city.concessionaria}, ANEEL`}
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${baseUrl}/energia-solar-em/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`Energia Solar em ${city.name} - ${city.state} | EFITEC SOLAR`} />
        <meta property="og:description" content={`Instalação profissional de painéis solares em ${city.name} - ${city.state}. Engenharia própria, marcas Tier-1 e homologação ANEEL completa.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${baseUrl}/energia-solar-em/${slug}`} />
        <meta property="og:image" content={`${baseUrl}/hero-solar-panels.jpg`} />
        <meta property="og:locale" content="pt_BR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Energia Solar em ${city.name} - ${city.state}`} />
        <meta name="twitter:description" content={`Instalação profissional de painéis solares em ${city.name}. Economize até 95% na conta de luz.`} />
        
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Header onOpenPopup={handleOpenPopup} />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-medium mb-6">
                <MapPin className="w-4 h-4" />
                Atendemos {city.name} e região
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
                Energia Solar em{' '}
                <span className="bg-text-gradient bg-clip-text text-transparent">
                  {city.name} - {city.state}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Projeto, Instalação e Homologação ANEEL com a {city.concessionaria}.
                Engenharia própria e marcas Tier-1.
              </p>

              <Button
                onClick={handleOpenPopup}
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-elegant text-base md:text-lg px-6 md:px-8 py-5 md:py-6 btn-press"
              >
                Solicitar orçamento gratuito
              </Button>
            </div>
          </div>
        </section>

        {/* City Info */}
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">
                Por que energia solar em {city.name}?
              </h2>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-card rounded-xl p-6 border border-border text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sun className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Irradiação Solar</h3>
                  <p className="text-2xl font-bold text-primary mb-1">{city.irradiacao}</p>
                  <p className="text-sm text-muted-foreground">kWh/m²/dia (média anual)</p>
                </div>

                <div className="bg-card rounded-xl p-6 border border-border text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Concessionária</h3>
                  <p className="text-2xl font-bold text-primary mb-1">{city.concessionaria}</p>
                  <p className="text-sm text-muted-foreground">Homologação facilitada</p>
                </div>

                <div className="bg-card rounded-xl p-6 border border-border text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Atendimento Local</h3>
                  <p className="text-2xl font-bold text-primary mb-1">100%</p>
                  <p className="text-sm text-muted-foreground">Equipe na sua região</p>
                </div>
              </div>

              {/* Cases */}
              {city.cases.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold mb-6">Projetos em {city.name}</h3>
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {city.cases.map((caseItem: any, index: number) => (
                      <div key={index} className="bg-card rounded-xl p-6 border border-border">
                        <h4 className="font-semibold mb-2">{caseItem.title}</h4>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sistema: {caseItem.kwp} kWp</span>
                          <span className="text-primary font-semibold">Economia: {caseItem.economy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ Local */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-xl font-bold mb-4">Perguntas frequentes em {city.name}</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Quanto tempo leva a homologação na {city.concessionaria}?</h4>
                    <p className="text-muted-foreground">
                      O prazo médio é de 30 a 60 dias. Acompanhamos todo o processo de documentação e protocolo.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">A irradiação solar em {city.name} é boa?</h4>
                    <p className="text-muted-foreground">
                      Com {city.irradiacao} kWh/m²/dia, {city.name} tem excelente potencial para geração fotovoltaica,
                      garantindo ótimo retorno sobre o investimento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <Button
                  onClick={handleOpenPopup}
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
          </div>
        </section>
      </main>

      <Footer />
      <PopupLeadForm isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
    </>
  );
};

export default CityPage;
