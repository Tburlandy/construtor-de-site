import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
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
import { buildFaqPageJsonLd } from '@/lib/faqJsonLd';
import { isPageSectionVisible } from '@/lib/sectionVisibility';
import { SEO } from '@/seo/SEO';

const Index = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPrefilledData, setPopupPrefilledData] = useState<any>(null);

  // Conteúdo carregado instantaneamente (sem loading)
  const content = getContentSync();

  useEffect(() => {
    // Persist UTM params on mount
    persistUtm();
  }, []);

  const handleOpenPopup = (prefilledData?: any) => {
    setPopupPrefilledData(prefilledData || null);
    setIsPopupOpen(true);
  };

  return (
    <>
      <SEO content={content} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(buildFaqPageJsonLd(content))}</script>
      </Helmet>

      <Header onOpenPopup={handleOpenPopup} content={content} />
      {isPageSectionVisible(content, 'hero') ? (
        <Hero onOpenPopup={handleOpenPopup} content={content} />
      ) : null}
      {isPageSectionVisible(content, 'financing') ? <Financing onOpenPopup={handleOpenPopup} /> : null}
      {isPageSectionVisible(content, 'fullService') ? <FullService onOpenPopup={handleOpenPopup} /> : null}
      {isPageSectionVisible(content, 'proofBar') ? <ProofBar onOpenPopup={handleOpenPopup} /> : null}
      {isPageSectionVisible(content, 'showcase') ? <Cases /> : null}
      {isPageSectionVisible(content, 'howItWorks') ? <HowItWorks /> : null}
      <Calculator onOpenPopup={handleOpenPopup} />
      <FAQ content={content} />
      <ContactBlock onOpenPopup={handleOpenPopup} />
      <Solutions />
      <Footer onOpenPopup={handleOpenPopup} />
      
      <PopupLeadForm 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)}
        prefilledData={popupPrefilledData}
        disableSecondaryWebhook
      />
    </>
  );
};

export default Index;
