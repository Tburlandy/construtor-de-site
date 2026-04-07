import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Content } from '@/content/schema';
import {
  DEFAULT_FAQ_SUBTITLE,
  DEFAULT_FAQ_TITLE_HIGHLIGHT,
  DEFAULT_FAQ_TITLE_PREFIX,
  getResolvedFaqItems,
} from '@/content/faqDefaults';

export type FAQProps = {
  content: Content;
};

export const FAQ = ({ content }: FAQProps) => {
  const items = getResolvedFaqItems(content);
  const titlePrefix = content.faq?.titlePrefix ?? DEFAULT_FAQ_TITLE_PREFIX;
  const titleHighlight = content.faq?.titleHighlight ?? DEFAULT_FAQ_TITLE_HIGHLIGHT;
  const subtitle = content.faq?.subtitle ?? DEFAULT_FAQ_SUBTITLE;

  return (
    <section id="faq" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {titlePrefix}{' '}
              <span className="bg-text-gradient bg-clip-text text-transparent">{titleHighlight}</span>
            </h2>
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {items.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left text-base font-semibold hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <div className="space-y-3">
                    {faq.answer.split('\n\n').map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
