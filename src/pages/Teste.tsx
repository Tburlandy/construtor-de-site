import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Financing } from '@/components/Financing';
import { FullService } from '@/components/FullService';
import { ProofBar } from '@/components/ProofBar';
import { Solutions } from '@/components/Solutions';
import { HowItWorks } from '@/components/HowItWorks';
import { Calculator } from '@/components/Calculator';
import { Cases } from '@/components/Cases';
import { FAQ } from '@/components/FAQ';
import { ContactBlock } from '@/components/ContactBlock';
import { Footer } from '@/components/Footer';
import { PopupLeadForm } from '@/components/PopupLeadForm';
import { persistUtm } from '@/lib/tracking';
import { getContentSync } from '@/lib/content';
import { SEO } from '@/seo/SEO';

const Teste = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPrefilledData, setPopupPrefilledData] = useState<any>(null);

  // Conteúdo carregado instantaneamente (sem loading)
  const content = getContentSync();

  useEffect(() => {
    // Persist UTM params on mount
    persistUtm();
  }, []);

  const city = content?.global.city || import.meta.env.VITE_CITY || 'Rio de Janeiro';
  const wppE164 = content?.global.whatsappE164 || import.meta.env.VITE_WPP_E164 || '5521999999999';
  const siteUrl = content?.global.siteUrl || 'https://www.efitecsolar.com';
  const basePath = import.meta.env.BASE_URL || '/';
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${basePath.replace(/\/$/, '')}`
    : siteUrl;

  const handleOpenPopup = (prefilledData?: any) => {
    setPopupPrefilledData(prefilledData || null);
    setIsPopupOpen(true);
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "EFITEC SOLAR - Energia Solar Fotovoltaica",
    "description": "Instalação de painéis solares fotovoltaicos com engenharia própria e marcas Tier-1",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": city,
      "addressRegion": import.meta.env.VITE_STATE || "RJ",
      "addressCountry": "BR"
    },
    "url": baseUrl,
    "telephone": `+${wppE164}`,
    "priceRange": "$$",
    "image": `${baseUrl}/hero-solar-panels.jpg`
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Instalação de Painéis Solares Fotovoltaicos",
    "provider": {
      "@type": "Organization",
      "name": "EFITEC SOLAR",
      "url": typeof window !== 'undefined'
        ? `${window.location.origin}${basePath.replace(/\/$/, '')}`
        : "https://seu-dominio.com"
    },
    "areaServed": {
      "@type": "Country",
      "name": "Brazil"
    },
    "description": "Instalação profissional de sistemas de energia solar fotovoltaica com engenharia própria",
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Serviços de Painéis Solares Fotovoltaicos",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Projeto de Painéis Solares Fotovoltaicos",
            "description": "Projeto técnico completo para instalação de sistema fotovoltaico"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Instalação de Painéis Solares e Sistemas Fotovoltaicos",
            "description": "Instalação profissional de painéis solares com equipe especializada"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Homologação ANEEL de Energia Solar",
            "description": "Acompanhamento completo do processo de homologação junto à ANEEL e concessionária"
          }
        }
      ]
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Qual é o payback típico de um sistema fotovoltaico?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O retorno do investimento varia entre 3 a 6 anos, dependendo do consumo, tarifa local e tipo de instalação. Após esse período, a economia é praticamente 100% durante os 25+ anos de vida útil do sistema."
        }
      },
      {
        "@type": "Question",
        "name": "Quanto tempo leva a homologação na ANEEL?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O prazo médio é de 30 a 60 dias após a instalação, dependendo da concessionária. Cuidamos de toda documentação e acompanhamento do processo."
        }
      },
      {
        "@type": "Question",
        "name": "É possível financiar o sistema?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim! Trabalhamos com linhas de crédito específicas do BV, Santander, Sicoob e outras instituições, com taxas reduzidas e prazos de até 120 meses."
        }
      }
    ]
  };

  return (
    <>
      <SEO content={content} />

      <Header onOpenPopup={handleOpenPopup} />
      <Hero onOpenPopup={handleOpenPopup} content={content} />
      <Financing onOpenPopup={handleOpenPopup} />
      <FullService onOpenPopup={handleOpenPopup} />
      <ProofBar onOpenPopup={handleOpenPopup} />
      <Cases />
      <HowItWorks />
      <Calculator onOpenPopup={handleOpenPopup} />
      <FAQ />
      <ContactBlock onOpenPopup={handleOpenPopup} />
      <Solutions />
      <Footer onOpenPopup={handleOpenPopup} />
      
      <PopupLeadForm 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)}
        prefilledData={popupPrefilledData}
      />
    </>
  );
};

export default Teste;
