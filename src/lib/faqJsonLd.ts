import type { Content } from '@/content/schema';
import { getResolvedFaqItems } from '@/content/faqDefaults';

/** FAQPage para JSON-LD alinhado às perguntas exibidas na landing. */
export function buildFaqPageJsonLd(content: Content) {
  const items = getResolvedFaqItems(content);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/\s*\n+\s*/g, ' ').trim(),
      },
    })),
  };
}
