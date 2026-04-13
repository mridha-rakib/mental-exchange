import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const VerificationSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('sessionId') || searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiServerClient.fetch(`/checkout/session/${sessionId}`);

        if (!response.ok) {
          throw new Error(t('verification_success.fetch_error'));
        }

        const data = await response.json();
        setSessionData(data);
      } catch (error) {
        console.error('Verification success session error:', error);
        toast.error(t('verification_success.details_load_error'));
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, t]);

  const isPaid = sessionData?.status === 'paid';
  const productName = sessionData?.metadata?.productName || t('verification_success.default_product');

  return (
    <>
      <Helmet>
        <title>{t('verification_success.meta_title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-16 px-4 sm:px-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="max-w-lg w-full shadow-card border-border/50 overflow-hidden">
          <CardHeader className="bg-green-50/50 pt-8 pb-6 px-6 flex flex-col items-center text-center border-b border-green-100">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-green-950 mb-2">
              {t('verification_success.title')}
            </CardTitle>
            <p className="text-green-800/80 font-medium">
              {t('verification_success.subtitle')}
            </p>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>{t('verification_success.loading_status')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50/50 border border-blue-100 rounded-[8px] p-6 text-center">
                  <ShieldCheck className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-blue-950 mb-2">{t('verification_success.next_step_title')}</h3>
                  <p className="text-sm text-blue-800/80">
                    {t('verification_success.next_step_body_prefix', { product: productName })} <strong>{t('seller.status_pending')}</strong> {t('verification_success.next_step_body_suffix')}
                  </p>
                </div>

                <div className="rounded-[8px] border bg-white p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Session-ID</span>
                    <span className="font-mono text-xs break-all">{sessionId || t('verification_success.unavailable')}</span>
                  </div>

                  {sessionData?.status && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{t('verification_success.payment_status')}</span>
                      <span className={`font-medium ${isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                        {sessionData.status}
                      </span>
                    </div>
                  )}

                  {typeof sessionData?.amountTotal === 'number' && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{t('verification_success.amount')}</span>
                      <span className="font-medium">€{(sessionData.amountTotal / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {t('verification_success.label_note')}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-muted/10 p-6 border-t">
            <Button
              variant="outline"
              className="w-full gap-2 h-12"
              onClick={() => navigate('/seller-dashboard')}
            >
              {t('verification_success.dashboard')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    </>
  );
};

export default VerificationSuccess;
