import { Button } from './ui/button';
import { trackCTAPopupOpen } from '@/lib/gtm';
import heroImage from '@/assets/hero-solar-panels.jpg';
import { BlackNovemberBanner } from './BlackNovemberBanner';
import type { Content } from '@/content/schema';
import { normalizeCoverImageLayout } from '@/lib/imageLayout';

interface HeroProps {
  onOpenPopup: () => void;
  content?: Content;
}

export const Hero = ({ onOpenPopup, content }: HeroProps) => {
  // Usa conteúdo dinâmico ou fallback
  const headline = content?.hero.headline || '⚡ Líder em painéis solares em São Gonçalo e Niterói';
  const subheadline = content?.hero.subheadline || '☀️ Instalação rápida, equipe especializada e condições acessíveis para transformar sua economia.';
  const ctaLabel = content?.hero.ctaLabel || 'Orçamento gratuito';
  const secondaryCtaLabel = content?.hero.secondaryCtaLabel || 'Fale no Whatsapp';
  const floatingCtaLabel = content?.hero.floatingCtaLabel || 'WhatsApp';
  const heroStats =
    content?.hero.stats?.length
      ? content.hero.stats
      : [
          { value: '+1000', label: 'Projetos instalados' },
          { value: '25 anos', label: 'de garantia nas placas' },
          { value: '100%', label: 'de satisfação no Google' },
          { value: '6 anos', label: 'No mercado' },
        ];
  const backgroundImage = content?.hero.background || heroImage;
  const heroImageLayout = normalizeCoverImageLayout(content?.imageLayout?.heroBackground);
  const handlePrimaryCTA = () => {
    trackCTAPopupOpen('hero');
    onOpenPopup();
  };

  const handleSecondaryCTA = () => {
    trackCTAPopupOpen('hero');
    onOpenPopup();
  };

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20">
      {/* ============ BLACK NOVEMBER BANNER - REMOVER COMPONENTE APÓS PROMOÇÃO ============ */}
      {/* <BlackNovemberBanner /> */}
      {/* ============ FIM BLACK NOVEMBER BANNER ============ */}
      
      {/* Hero Image Background */}
      <div className="absolute inset-0">
        <img 
          src={backgroundImage.startsWith('/') || backgroundImage.startsWith('http') ? backgroundImage : heroImage} 
          alt="Painéis solares fotovoltaicos instalados" 
          className="w-full h-full object-cover"
          style={{
            objectPosition: `${heroImageLayout.x}% ${heroImageLayout.y}%`,
            transform: `scale(${heroImageLayout.scale})`,
            transformOrigin: `${heroImageLayout.x}% ${heroImageLayout.y}%`,
          }}
          width="1920"
          height="1080"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/95" />
      </div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - Mobile optimized */}
          <div className="hidden items-center gap-2 px-3 py-2 md:px-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-medium mb-6 md:mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="hidden sm:inline">☀️ Painéis Solares Fotovoltaicos • Engenharia própria • Marcas Tier-1</span>
            <span className="sm:hidden">☀️ Painéis Solares</span>
          </div>

          {/* Main Heading - Mobile first typography */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 md:mb-6 pt-12 md:pt-16 animate-fade-in-up">
            {headline.includes('{{city}}') ? (
              <>
                {headline.split('{{city}}').map((part, i, arr) => {
                  const beforeCity = part.split('painéis solares');
                  return i < arr.length - 1 ? (
                    <span key={i}>
                      {beforeCity.map((subPart, j, subArr) => 
                        j < subArr.length - 1 ? (
                          <span key={j}>
                            {subPart}
                            <span className="bg-text-gradient bg-clip-text text-transparent">painéis solares</span>
                          </span>
                        ) : (
                          <span key={j}>{subPart}</span>
                        )
                      )}
                      <span className="bg-text-gradient bg-clip-text text-transparent">
                        {content?.global.city || 'Niterói - RJ'}
                      </span>
                    </span>
                  ) : (
                    <span key={i}>
                      {beforeCity.map((subPart, j, subArr) => 
                        j < subArr.length - 1 ? (
                          <span key={j}>
                            {subPart}
                            <span className="bg-text-gradient bg-clip-text text-transparent">painéis solares</span>
                          </span>
                        ) : (
                          <span key={j}>{subPart}</span>
                        )
                      )}
                    </span>
                  );
                })}
              </>
            ) : (
              headline.split('painéis solares').map((part, i, arr) => 
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <span className="bg-text-gradient bg-clip-text text-transparent">painéis solares</span>
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )
            )}
          </h1>

          {/* Subheading - Mobile optimized */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto px-2 animate-fade-in-up stagger-1">
            {subheadline}
          </p>

          {/* CTA Buttons - Mobile optimized with press effect */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-12 md:mb-16 px-4 animate-fade-in-up stagger-2">
            <Button 
              onClick={handlePrimaryCTA}
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-elegant text-sm md:text-base px-6 md:px-8 py-5 md:py-6 btn-press"
            >
              {ctaLabel}
            </Button>
            <Button 
              onClick={handleSecondaryCTA}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-[#25D366] hover:bg-[#25D366]/10 hover:text-white text-sm md:text-base px-6 md:px-8 py-5 md:py-6 btn-press"
            >
              <svg className="mr-2 w-4 h-4 md:w-5 md:h-5" fill="#25D366" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {secondaryCtaLabel}
            </Button>
          </div>

          {/* Stats - Mobile first grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto px-4">
            {heroStats.slice(0, 4).map((item, index) => (
              <div key={`${item.value}-${item.label}-${index}`} className="text-center animate-fade-in-up stagger-5">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{item.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <button
        onClick={() => {
          trackCTAPopupOpen('sticky');
          onOpenPopup();
        }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant flex items-center justify-center transition-transform hover:scale-110"
        aria-label="WhatsApp"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        <span className="sr-only">{floatingCtaLabel}</span>
      </button>
    </section>
  );
};
