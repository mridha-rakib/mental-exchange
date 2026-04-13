import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import SellerActivationFlow from '@/components/SellerActivationFlow.jsx';

const SellerInfoPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isSeller } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated && isSeller) {
      navigate('/seller/new-product');
    }
  }, [isAuthenticated, isSeller, navigate]);

  return (
    <>
      <Helmet>
        <title>{t('seller.become_title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 min-h-[80vh] bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fb_100%)] py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10 md:mb-14">
            <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-[#0000FF]" />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-['Playfair_Display'] mb-4 text-gray-950">
              {t('seller.hero_title')}
            </h1>
            <p className="text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              {t('seller.hero_body')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Benefits Section */}
            <Card className="h-full border border-[hsl(var(--border))] shadow-none bg-white">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-semibold mb-2 font-['Playfair_Display'] text-gray-950">{t('seller.benefits_title')}</h3>
                <div className="mb-6 h-px w-full bg-[hsl(var(--border))]" />
                <ul className="space-y-5">
                  <li className="flex items-start gap-4 rounded-[8px] border border-transparent p-2 transition-colors hover:border-green-100 hover:bg-green-50/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-green-50 text-green-600">
                      <CheckCircle size={21} />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{t('seller.benefit_reach_title')}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{t('seller.benefit_reach_body')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 rounded-[8px] border border-transparent p-2 transition-colors hover:border-green-100 hover:bg-green-50/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-green-50 text-green-600">
                      <CheckCircle size={21} />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{t('seller.benefit_free_title')}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{t('seller.benefit_free_body')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 rounded-[8px] border border-transparent p-2 transition-colors hover:border-green-100 hover:bg-green-50/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-green-50 text-green-600">
                      <CheckCircle size={21} />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{t('seller.benefit_shipping_title')}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{t('seller.benefit_shipping_body')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 rounded-[8px] border border-transparent p-2 transition-colors hover:border-green-100 hover:bg-green-50/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-green-50 text-green-600">
                      <CheckCircle size={21} />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{t('seller.benefit_payment_title')}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{t('seller.benefit_payment_body')}</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Action Section */}
            <div>
              {!isAuthenticated ? (
                <Card className="h-full border border-[hsl(var(--border))] shadow-none bg-white text-center">
                  <CardContent className="p-6 py-10 md:p-8 md:py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-[8px] flex items-center justify-center mx-auto mb-6 text-[#0000FF]">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3 font-['Playfair_Display'] text-gray-950">{t('seller.login_prompt_title')}</h3>
                    <p className="text-muted-foreground mb-8 leading-7">
                      {t('seller.login_prompt_body')}
                    </p>
                    <div className="flex flex-col gap-3">
                      <Link to="/auth" className="block">
                        <Button className="w-full min-h-12 h-auto rounded-[8px] bg-[#0000FF] px-4 py-3 text-sm md:text-base font-semibold leading-snug whitespace-normal text-center text-white gap-2 shadow-none hover:bg-[#0000CC]">
                          <LogIn className="w-5 h-5 shrink-0 text-white" />
                          <span className="min-w-0">{t('seller.login_or_register')}</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <SellerActivationFlow />
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
};

export default SellerInfoPage;
