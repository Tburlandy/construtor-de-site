import { Helmet } from 'react-helmet-async';
import type { Content } from '@/content/schema';

interface SEOProps {
  content: Content;
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
}

export const SEO = ({ content, title, description, canonical, ogImage }: SEOProps) => {
  const seoTitle = title || content.seo.title;
  const seoDescription = description || content.seo.description;
  const basePath = import.meta.env.BASE_URL || '/';
  const originWithBase = typeof window !== 'undefined'
    ? `${window.location.origin}${basePath.replace(/\/$/, '')}`
    : '';
  
  // Processa canonical substituindo variáveis
  const processCanonical = (url: string): string => {
    return url
      .replace(/\{\{siteUrl\}\}/g, content.global.siteUrl)
      .replace(/\{\{brand\}\}/g, content.global.brand)
      .replace(/\{\{city\}\}/g, content.global.city)
      .replace(/\{\{whatsappE164\}\}/g, content.global.whatsappE164);
  };
  
  const rawCanonical = canonical || content.seo.canonical || originWithBase;
  const seoCanonical = processCanonical(rawCanonical);
  
  const seoOgImage = ogImage || content.seo.ogImage || '/hero-solar-panels.jpg';
  const fullOgImage = seoOgImage.startsWith('http') 
    ? seoOgImage 
    : `${originWithBase}${seoOgImage.startsWith('/') ? '' : '/'}${seoOgImage}`;

  // Processa JSON-LD substituindo variáveis
  const processJsonLd = (jsonLd: any): any => {
    if (typeof jsonLd === 'string') {
      return jsonLd
        .replace(/\{\{siteUrl\}\}/g, content.global.siteUrl)
        .replace(/\{\{brand\}\}/g, content.global.brand)
        .replace(/\{\{city\}\}/g, content.global.city)
        .replace(/\{\{whatsappE164\}\}/g, content.global.whatsappE164);
    }
    if (Array.isArray(jsonLd)) {
      return jsonLd.map(processJsonLd);
    }
    if (jsonLd && typeof jsonLd === 'object') {
      const processed: any = {};
      for (const [key, value] of Object.entries(jsonLd)) {
        processed[key] = processJsonLd(value);
      }
      return processed;
    }
    return jsonLd;
  };

  const jsonLd = processJsonLd(content.seo.jsonLd);

  return (
    <Helmet>
      <html lang="pt-BR" />
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={seoCanonical} />
      
      {/* Open Graph */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={seoCanonical} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1920" />
      <meta property="og:image:height" content="1080" />
      <meta property="og:locale" content="pt_BR" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* JSON-LD Structured Data */}
      {jsonLd && Object.keys(jsonLd).length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
