import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent } from './ui/dialog';
import { persistUtm, getUtmPayload, getDevice, nowLocal } from '@/lib/tracking';
import { sanitizeDigits, isValidBRPhone } from '@/lib/phone';
import { useToast } from '@/hooks/use-toast';
import { fetchContent } from '@/lib/content';
import { isValidWebhookUrl, sendWebhookToUrls } from '@/lib/webhookClient';

interface PopupLeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledData?: any;
  disableSecondaryWebhook?: boolean;
}

async function submitLead({
  nome,
  telefone,
  disableSecondaryWebhook,
}: {
  nome: string;
  telefone: string;
  disableSecondaryWebhook?: boolean;
}) {
  persistUtm();
  const trackingParams = getUtmPayload();
  const { data, horario } = nowLocal();

  const digits = sanitizeDigits(telefone);
  if (!isValidBRPhone(digits)) throw new Error('Telefone inválido');

  // Busca config do content.json ou usa env
  let webhookUrl = import.meta.env.VITE_WEBHOOK_URL || '';
  let secondaryWebhookUrl = import.meta.env.VITE_WEBHOOK_URL_SECONDARY || '';
  let formId = import.meta.env.VITE_FORM_ID || '54b01719'; // Valor padrão da planilha
  let formName = import.meta.env.VITE_FORM_NAME || 'Acompanhamento'; // Valor padrão da planilha
  let canalId = import.meta.env.VITE_CANAL_ID || '';
  try {
    const content = await fetchContent();
    if (content?.global?.webhookUrl) {
      webhookUrl = content.global.webhookUrl;
    }
    if (content?.global?.secondaryWebhookUrl) {
      secondaryWebhookUrl = content.global.secondaryWebhookUrl;
    }
    if (content?.global?.formId) formId = content.global.formId;
    if (content?.global?.formName) formName = content.global.formName;
    if (content?.global?.canalId) canalId = content.global.canalId;
  } catch {}

  if (disableSecondaryWebhook) {
    secondaryWebhookUrl = '';
  }

  // Padrão exato do Elementor - todos os campos devem estar presentes
  const params = new URLSearchParams({
    Nome: nome,
    Telefone: telefone,
    'Forma de Contato': 'Popup WhatsApp',
    CampanhaID: trackingParams.CampanhaID || '',
    GrupoID: trackingParams.GrupoID || '',
    Extensão: trackingParams.Extensão || '',
    CorrespondenciaPalavra: trackingParams.CorrespondenciaPalavra || '',
    Dispositivo: trackingParams.Dispositivo || getDevice(),
    Anuncio: trackingParams.Anuncio || '',
    PalavraChave: trackingParams.PalavraChave || '',
    canal_id: canalId,
    Data: data,
    Horário: horario,
    form_id: formId,
    form_name: formName,
  });

  // Log para debug (remover em produção se necessário)
  console.log('📤 Webhook payload:', {
    urls: [secondaryWebhookUrl, webhookUrl].filter(Boolean),
    formId,
    formName,
    canalId,
    body: params.toString(),
    fields: Object.fromEntries(params.entries()),
  });

  const urls = [secondaryWebhookUrl, webhookUrl].filter(isValidWebhookUrl);
  if (!urls.length) {
    console.warn('Webhook URL não configurada');
    return false;
  }

  try {
    await sendWebhookToUrls(urls, params.toString());
    return true;
  } catch (e) {
    console.warn('Webhook falhou:', e);
    // Não bloquear o fluxo - retornar true para permitir redirecionamento
    return true;
  }
}

export const PopupLeadForm = ({
  isOpen,
  onClose,
  disableSecondaryWebhook,
}: PopupLeadFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ nome?: string; telefone?: string }>({});
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form and errors when opening
      setFormData({
        nome: '',
        telefone: '',
      });
      setErrors({});

      // Trap focus
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const validateForm = () => {
    const newErrors: { nome?: string; telefone?: string } = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Preencha este campo.';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Preencha este campo.';
    } else {
      const phoneDigits = sanitizeDigits(formData.telefone);
      if (!isValidBRPhone(phoneDigits)) {
        newErrors.telefone = 'Digite um telefone válido com DDD (10-11 dígitos)';
      }
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateForm();

    if (!isValid) {
      const errorMessages = Object.values(validationErrors).filter(Boolean);
      if (errorMessages.length > 0) {
        toast({
          title: 'Preencha os campos corretamente',
          description: errorMessages.join('. '),
          variant: 'destructive',
        });
      }
      return;
    }

    setIsSubmitting(true);

    // Disparar evento GTM ANTES do submit (garantir conversão marcada)
    const gtmEvent = {
      event: 'lead_submit',
      form_origin: 'popup_whatsapp',
      lead_name: formData.nome.trim(),
      lead_phone: formData.telefone,
    };
    
    // Push para dataLayer - GTM processa automaticamente
    if ((window as any).dataLayer) {
      (window as any).dataLayer.push(gtmEvent);
      console.log('✅ GTM Event pushed:', gtmEvent);
    }

    try {
      // Tentar enviar para webhook (não bloqueia o fluxo se falhar)
      const success = await submitLead({
        nome: formData.nome.trim(),
        telefone: formData.telefone,
        disableSecondaryWebhook,
      });

      // Delay maior para garantir que o evento GTM seja processado antes do redirect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Busca WhatsApp do content.json ou usa env
      let whatsapp = import.meta.env.VITE_WPP_E164 || '5521999999999';
      try {
        const content = await fetchContent();
        if (content?.global?.whatsappE164) {
          whatsapp = content.global.whatsappE164;
        }
      } catch {}

      // Redirect to WhatsApp
      const txt = `Olá, sou ${formData.nome.trim()} e preciso de ajuda. Vim pelo Google.`;
      const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(txt)}`;
      location.href = wa;
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente ou entre em contato via WhatsApp',
        variant: 'destructive',
      });

      // Fallback: try WhatsApp anyway
      setTimeout(async () => {
        let whatsapp = import.meta.env.VITE_WPP_E164 || '5521999999999';
        try {
          const content = await fetchContent();
          if (content?.global?.whatsappE164) {
            whatsapp = content.global.whatsappE164;
          }
        } catch {}
        const txt = `Olá, sou ${formData.nome.trim()} e preciso de ajuda. Vim pelo Google.`;
        const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(txt)}`;
        location.href = wa;
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneInput = (value: string) => {
    const digits = sanitizeDigits(value).slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length <= 5) {
      return `(${ddd}) ${rest}`;
    }
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  };

  const handleOpenPopup = () => {
    // GTM Event
    ;(window as any).dataLayer?.push({
      event: 'cta_whatsapp_click',
    });
  };

  useEffect(() => {
    if (isOpen) {
      handleOpenPopup();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto safe-area-bottom" aria-modal="true">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 whitespace-nowrap">Orçamento gratuito</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="relative">
            {errors.nome && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center animate-fade-in-up z-50 pointer-events-none mb-2">
                <div className="relative bg-orange-500 text-white rounded-lg px-4 py-2.5 shadow-elegant flex items-center gap-2 min-w-[200px] max-w-[90%]">
                  <div className="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
                  </div>
                  <span className="text-sm font-medium">{errors.nome}</span>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 rotate-45"></div>
                </div>
              </div>
            )}
            <Label htmlFor="nome" className="text-sm">
              Nome completo *
            </Label>
            <Input
              id="nome"
              type="text"
              required
              value={formData.nome}
              onChange={(e) => {
                setFormData({ ...formData, nome: e.target.value });
                if (errors.nome) {
                  setErrors({ ...errors, nome: undefined });
                }
              }}
              onBlur={() => {
                if (!formData.nome.trim()) {
                  setErrors({ ...errors, nome: 'Preencha este campo.' });
                } else if (formData.nome.trim().length < 2) {
                  setErrors({ ...errors, nome: 'Nome deve ter pelo menos 2 caracteres' });
                } else {
                  setErrors({ ...errors, nome: undefined });
                }
              }}
              placeholder="Seu nome"
              className={`mt-1 h-11 sm:h-10 transition-all ${errors.nome ? 'border-orange-500 focus-visible:ring-orange-500 focus-visible:ring-2' : 'border-border'}`}
              aria-invalid={!!errors.nome}
            />
          </div>

          <div className="relative">
            {errors.telefone && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center animate-fade-in-up z-50 pointer-events-none mb-2">
                <div className="relative bg-orange-500 text-white rounded-lg px-4 py-2.5 shadow-elegant flex items-center gap-2 min-w-[200px] max-w-[90%]">
                  <div className="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
                  </div>
                  <span className="text-sm font-medium">{errors.telefone}</span>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 rotate-45"></div>
                </div>
              </div>
            )}
            <Label htmlFor="telefone" className="text-sm">
              Telefone/WhatsApp *
            </Label>
            <Input
              id="telefone"
              type="tel"
              inputMode="numeric"
              pattern="\(\d{2}\)\s?\d{4,5}-\d{4}"
              required
              value={formData.telefone}
              onChange={(e) => {
                setFormData({ ...formData, telefone: formatPhoneInput(e.target.value) });
                if (errors.telefone) {
                  setErrors({ ...errors, telefone: undefined });
                }
              }}
              onBlur={() => {
                if (!formData.telefone.trim()) {
                  setErrors({ ...errors, telefone: 'Preencha este campo.' });
                } else {
                  const phoneDigits = sanitizeDigits(formData.telefone);
                  if (!isValidBRPhone(phoneDigits)) {
                    setErrors({ ...errors, telefone: 'Digite um telefone válido com DDD (10-11 dígitos)' });
                  } else {
                    setErrors({ ...errors, telefone: undefined });
                  }
                }
              }}
              placeholder="(00) 00000-0000"
              className={`mt-1 h-11 sm:h-10 transition-all ${errors.telefone ? 'border-orange-500 focus-visible:ring-orange-500 focus-visible:ring-2' : 'border-border'}`}
              aria-invalid={!!errors.telefone}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold btn-press h-12 text-sm sm:text-base"
          >
            {isSubmitting ? (
              'Enviando...'
            ) : (
              <>
                <svg className="mr-2 w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Fale no Whatsapp
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ao enviar, você será redirecionado para o WhatsApp
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
