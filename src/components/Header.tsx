import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { trackCTAPopupOpen } from '@/lib/gtm';
import type { Content } from '@/content/schema';
import { normalizeLogoImageLayout } from '@/lib/imageLayout';

interface HeaderProps {
  onOpenPopup: () => void;
  content?: Content;
}

export const Header = ({ onOpenPopup, content }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const logoLayout = normalizeLogoImageLayout(content?.imageLayout?.logo);
  const logoSrc = content?.global.logo || 'https://www.efitecsolar.com/assets/images/logo.png';

  const handleCTA = () => {
    trackCTAPopupOpen('header');
    onOpenPopup();
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top transition-all duration-300" style={{ marginTop: 'var(--banner-height, 0px)', marginBottom: 0 }}>
      <nav className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center transition-transform duration-300 hover:scale-105">
          <img 
            src={logoSrc}
            alt={content?.global.brand || 'EFITEC SOLAR'}
            className="h-10 md:h-12 w-auto origin-left"
            style={{
              transform: `translate(${logoLayout.x}px, ${logoLayout.y}px) scale(${logoLayout.scale})`,
            }}
            width="150"
            height="50"
            loading="eager"
            decoding="async"
          />
        </a>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8">
          <button onClick={() => scrollToSection('forma-pagamento')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Forma de pagamento
          </button>
          <button onClick={() => scrollToSection('cuidamos-tudo')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Como funciona?
          </button>
          <button onClick={() => scrollToSection('sobre-nos')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sobre nós
          </button>
          <button onClick={() => scrollToSection('casos')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cases
          </button>
        </div>

        {/* CTA Button - Desktop */}
        <Button 
          onClick={handleCTA}
          className="hidden lg:flex bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold shadow-elegant btn-press"
        >
          <svg className="mr-2 w-4 h-4" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Fale no Whatsapp
        </Button>

        {/* Mobile WhatsApp Button & Menu Button */}
        <div className="lg:hidden flex items-center gap-2 flex-1 justify-end">
          <Button 
            onClick={handleCTA}
            className="bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold shadow-elegant btn-press px-4 py-2.5 text-base min-w-[50%] flex-1 max-w-[70%] h-auto"
          >
            <svg className="mr-2 w-4 h-4 sm:w-5 sm:h-5" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span className="whitespace-nowrap">WhatsApp</span>
          </Button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-foreground flex-shrink-0"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu - Smooth slide in */}
      {isMenuOpen && (
        <div className="lg:hidden bg-card border-t border-border animate-fade-in">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-3">
            <button onClick={() => scrollToSection('forma-pagamento')} className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              Forma de pagamento
            </button>
            <button onClick={() => scrollToSection('cuidamos-tudo')} className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              Como funciona?
            </button>
            <button onClick={() => scrollToSection('sobre-nos')} className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              Sobre nós
            </button>
            <button onClick={() => scrollToSection('casos')} className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              Cases
            </button>
            <Button 
              onClick={handleCTA}
              className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold mt-2"
            >
              <svg className="mr-2 w-4 h-4" fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Fale no Whatsapp
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
