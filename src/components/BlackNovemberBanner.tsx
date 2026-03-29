import { useState, useEffect, useRef } from 'react';
import { Zap, Tag, Sparkles } from 'lucide-react';

export const BlackNovemberBanner = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Efeito para detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsScrolled(scrolled);
    };

    // Verifica estado inicial
    handleScroll();
    
    // Adiciona listener no window
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Efeito para atualizar altura da tarja usando elemento de medição sempre visível
  useEffect(() => {
    const updateBannerHeight = () => {
      if (measureRef.current) {
        const bannerHeight = measureRef.current.offsetHeight;
        if (isScrolled && bannerHeight > 0) {
          document.documentElement.style.setProperty('--banner-height', `${bannerHeight}px`);
        } else {
          document.documentElement.style.setProperty('--banner-height', '0px');
        }
      }
    };

    const handleResize = () => {
      updateBannerHeight();
    };

    // Atualiza altura quando o estado muda ou quando redimensiona
    updateBannerHeight();
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isScrolled]);

  return (
    <>
      {/* Elemento oculto para medir altura da tarja */}
      <div 
        ref={measureRef}
        className="invisible fixed top-0 left-0 right-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="relative bg-gradient-to-r from-background via-accent/5 to-background backdrop-blur-xl">
          <div className="container mx-auto px-4 relative">
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 py-2 sm:py-2.5 md:py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-accent flex-shrink-0" fill="currentColor" />
              <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-accent uppercase tracking-wider whitespace-nowrap">
                Black November
              </span>
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/10 border border-accent/20">
                <span className="text-[10px] sm:text-xs md:text-sm text-foreground font-semibold whitespace-nowrap">
                  🔥 Melhor preço do ano 🔥
                </span>
              </div>
              <span className="sm:hidden text-[10px] text-foreground font-semibold whitespace-nowrap">
                🔥 Melhor preço do ano
              </span>
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-accent flex-shrink-0" fill="currentColor" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Badge Premium no Hero - Maior e com mais destaque */}
      <div className="absolute top-[6rem] sm:top-[7rem] md:top-[7.85rem] left-1/2 -translate-x-1/2 z-10 animate-fade-in mb-8 sm:mb-12 md:mb-16 px-4">
        <div className="relative group w-full max-w-fit mx-auto">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-70 blur-xl group-hover:opacity-90 transition duration-300 rounded-full" />
          
          <div className="relative inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 border-2 border-amber-300/50 backdrop-blur-md shadow-2xl">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white drop-shadow-lg flex-shrink-0" />
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-0.5 sm:gap-2">
              <span className="text-xs sm:text-sm md:text-lg font-black text-white uppercase tracking-wider drop-shadow-lg whitespace-nowrap">
                Black November
              </span>
              <span className="text-[10px] sm:text-xs md:text-base text-white/95 font-bold drop-shadow-md whitespace-nowrap">
                🔥 Melhor preço do ano
              </span>
            </div>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white drop-shadow-lg flex-shrink-0" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Tarja Sticky Premium - Aparece apenas quando faz scroll (não aparece na primeira seção) */}
      <div 
        ref={bannerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{ margin: 0, padding: 0, willChange: 'transform' }}
      >
        <div className="relative bg-gradient-to-r from-background via-accent/5 to-background backdrop-blur-xl" style={{ margin: 0, padding: 0 }}>
          {/* Linha de destaque sutil */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
          
          <div className="container mx-auto px-4 relative" style={{ margin: 0 }}>
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 py-2 sm:py-2.5 md:py-3" style={{ margin: 0 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-accent flex-shrink-0" fill="currentColor" />
              <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-accent uppercase tracking-wider whitespace-nowrap">
                Black November
              </span>
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-accent/10 border border-accent/20">
                <span className="text-[10px] sm:text-xs md:text-sm text-foreground font-semibold whitespace-nowrap">
                  🔥 Melhor preço do ano 🔥
                </span>
              </div>
              <span className="sm:hidden text-[10px] text-foreground font-semibold whitespace-nowrap">
                🔥 Melhor preço do ano
              </span>
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-accent flex-shrink-0" fill="currentColor" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
