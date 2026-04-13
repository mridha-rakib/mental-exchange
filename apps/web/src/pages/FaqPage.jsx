import React from 'react';
import { Helmet } from 'react-helmet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.jsx';
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const faqs = [
  {
    questionKey: 'faq.sell_question',
    answerKey: 'faq.sell_answer',
  },
  {
    questionKey: 'faq.shipping_question',
    answerKey: 'faq.shipping_answer',
  },
  {
    questionKey: 'faq.safe_question',
    answerKey: 'faq.safe_answer',
  },
];

const FaqPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>FAQ - Zahnibörse</title>
      </Helmet>

      <PageShell
        eyebrow={t('footer.support')}
        title={t('faq.title')}
        description={t('faq.description')}
      >
        <ContentPanel>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, index) => (
              <AccordionItem key={item.questionKey} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold hover:text-[#0000FF]">
                  {t(item.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base leading-7 text-[hsl(var(--secondary-text))]">
                  {t(item.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ContentPanel>
      </PageShell>
    </>
  );
};

export default FaqPage;
