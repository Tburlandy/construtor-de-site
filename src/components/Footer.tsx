import { Link } from 'react-router-dom';
import { fetchContent } from '@/lib/content';
import { useEffect, useState } from 'react';
import type { Content } from '@/content/schema';
import { trackCTAPopupOpen } from '@/lib/gtm';

interface FooterProps {
  onOpenPopup?: () => void;
}

export const Footer = ({ onOpenPopup }: FooterProps) => {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    fetchContent().then(setContent);
  }, []);

  const cnpj = content?.global.cnpj || '00.000.000/0001-00';
  const address = content?.global.address || 'Rua Exemplo, 123\nCentro - Rio de Janeiro/RJ\nCEP: 20000-000';
  const whatsapp = content?.global.whatsappE164 || '5521999999999';

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img 
                src="https://www.efitecsolar.com/assets/images/logo.png" 
                alt="EFITEC SOLAR" 
                className="h-10 md:h-12 w-auto mb-4"
                width="150"
                height="50"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ☀️ Painéis solares fotovoltaicos de alto desempenho com engenharia própria e pós-venda real.
            </p>
            <p className="text-xs text-muted-foreground">
              CNPJ: {cnpj}
            </p>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-semibold mb-4">Contato</h3>
            <div className="space-y-4">
              <button 
                onClick={() => {
                  trackCTAPopupOpen('footer');
                  onOpenPopup?.();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold rounded-lg transition-all btn-press shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Falar no WhatsApp
              </button>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">📍 Endereço:</p>
                <p style={{ whiteSpace: 'pre-line' }}>{address}</p>
              </div>
            </div>
          </div>

          {/* Institucional */}
          <div>
            <h3 className="font-semibold mb-4">Institucional</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Sobre nós
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  LGPD
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SolarTech. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
