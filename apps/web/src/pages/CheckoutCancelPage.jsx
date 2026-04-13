import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const CheckoutCancelPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('checkout_cancel.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12 md:py-20">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-[hsl(var(--border))] p-6 md:p-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-['Playfair_Display']">{t('checkout_cancel.title')}</h1>
            <p className="text-[hsl(var(--secondary-text))] mb-8">
              {t('checkout_cancel.body')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button onClick={() => navigate('/checkout')} className="bg-[#0000FF] hover:bg-[#0000CC] text-white">
                {t('cart.checkout')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/marketplace')}>
                {t('cart.continue')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CheckoutCancelPage;
