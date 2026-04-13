import React from 'react';
import { Helmet } from 'react-helmet';
import { Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const ContactPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('contact.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-[hsl(var(--border))] p-6 md:p-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-['Playfair_Display']">{t('contact.title')}</h1>
            <p className="text-[hsl(var(--secondary-text))] mb-8">
              {t('contact.body')}
            </p>

            <div className="space-y-5">
              <a href="mailto:info@zahniboerse.com" className="flex items-center gap-4 p-4 rounded-[8px] border border-[hsl(var(--border))] hover:border-[#0000FF] transition-colors">
                <Mail className="w-5 h-5 text-[#0000FF]" />
                <span className="font-medium">info@zahniboerse.com</span>
              </a>

              <a href="tel:+4915223496241" className="flex items-center gap-4 p-4 rounded-[8px] border border-[hsl(var(--border))] hover:border-[#0000FF] transition-colors">
                <Phone className="w-5 h-5 text-[#0000FF]" />
                <span className="font-medium">+49 1522 3496241</span>
              </a>
            </div>

            <div className="mt-8">
              <Button asChild className="bg-[#0000FF] hover:bg-[#0000CC] text-white">
                <a href="mailto:info@zahniboerse.com">{t('contact.write_email')}</a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ContactPage;
