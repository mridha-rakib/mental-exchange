import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CreditCard, Download, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import AccountLayout from '@/components/AccountLayout.jsx';
import { createLearningBillingPortal, getLearningSubscriptionDetails } from '@/lib/learningApi.js';
import { localizeLearningSubscriptionDetails } from '@/lib/learningContentLocalization.js';
import {
  formatLearningPrice,
  getBillingIntervalLabel,
  getNextChargeCopy,
  getPriceIntervalLabel,
} from '@/lib/learningPresentation.js';
import {
  getSubscriptionDateLabelKey,
  getSubscriptionDisplayEndDate,
  getSubscriptionStatusHintKey,
  getSubscriptionStatusLabel,
  getSubscriptionStatusToneClass,
} from '@/lib/subscriptionStatus.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const formatDate = (value, locale) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const LearningSubscriptionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useTranslation();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const token = pb.authStore.token;

    if (!token) {
      navigate('/auth');
      return undefined;
    }

    const load = async () => {
      try {
        const result = await getLearningSubscriptionDetails({ token });
        if (active) {
          setDetails(localizeLearningSubscriptionDetails(result, language));
        }
      } catch (error) {
        console.error('Failed to load learning subscription page:', error);
        if (active) {
          toast.error(error.message || t('learning.dashboard_load_error'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [language, navigate, t]);

  const locale = language === 'DE' ? 'de-DE' : 'en-US';
  const subscription = details?.subscription;
  const paymentState = searchParams.get('payment');

  const statusLabel = useMemo(() => getSubscriptionStatusLabel(t, subscription?.status), [subscription?.status, t]);
  const subscriptionStatus = subscription?.status || '';
  const statusHintKey = getSubscriptionStatusHintKey(subscriptionStatus);
  const displayEndDate = getSubscriptionDisplayEndDate(subscription);
  const formattedDisplayEndDate = formatDate(displayEndDate, locale);
  const formattedCurrentPeriodEnd = formatDate(subscription?.currentPeriodEnd, locale);
  const dateLabelKey = getSubscriptionDateLabelKey(subscription);
  const billingIntervalLabel = getBillingIntervalLabel(t, subscription?.billingInterval);
  const nextChargeCopy = getNextChargeCopy(t, subscription, formattedCurrentPeriodEnd);
  const portalActionLabel = subscription?.cancelAtPeriodEnd || subscriptionStatus === 'canceled'
    ? t('learning.reactivate')
    : t('learning.cancel_subscription');

  const handlePortal = async (action = '') => {
    const token = pb.authStore.token;
    if (!token) {
      navigate('/auth');
      return;
    }

    setPortalLoading(true);
    try {
      const result = await createLearningBillingPortal({ token, action });
      if (!result.url) {
        throw new Error(t('learning.portal_error'));
      }

      window.location.href = result.url;
    } catch (error) {
      console.error('Failed to open learning billing portal:', error);
      toast.error(error.message || t('learning.portal_error'));
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] text-slate-500">{t('common.loading')}</div>;
  }

  if (!subscription || !details?.package) {
    return (
      <AccountLayout activeKey="subscriptions" className="learning-shell" contentClassName="max-w-3xl">
        <div className="rounded-[8px] border border-black/6 bg-white p-8 text-center shadow-card">
            <h1 className="text-4xl font-bold text-slate-900">{t('learning.no_subscription_title')}</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{t('learning.no_subscription_body')}</p>
        </div>
      </AccountLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${t('learning.my_subscription')} - Zahnibörse`}</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Helmet>

      <AccountLayout activeKey="subscriptions" className="learning-shell">
        <div>
          <Link to="/learning/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#0000FF]">
            <ArrowLeft className="size-4" />
            {t('learning.dashboard')}
          </Link>

          <section className="mt-6 grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="learning-card p-6 md:p-8">
              <Badge className="rounded-[8px] bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                {t('learning.my_subscription')}
              </Badge>
              <h1 className="mt-5 text-4xl font-bold text-slate-900">{details.package.title}</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">{details.package.subtitle}</p>

              {paymentState === 'success' && (
                <div className="mt-6 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  {t('learning.payment_success')}
                </div>
              )}

              {statusHintKey && (
                <div className={`mt-6 rounded-[8px] border p-4 text-sm ${getSubscriptionStatusToneClass(subscriptionStatus)}`}>
                  {t(statusHintKey)}
                </div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="learning-subtle-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('learning.price_interval_label')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {getPriceIntervalLabel(t, subscription.priceAmount, subscription.currency, subscription.billingInterval, locale)}
                  </p>
                </div>
                <div className="learning-subtle-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('learning.payment_status')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{statusLabel}</p>
                </div>
                <div className="learning-subtle-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('learning.start_date')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatDate(subscription.currentPeriodStart, locale)}</p>
                </div>
                <div className="learning-subtle-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t(dateLabelKey)}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formattedDisplayEndDate}</p>
                </div>
              </div>

              {subscription.cancelAtPeriodEnd && subscriptionStatus !== 'canceled' && (
                <div className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {t('learning.cancel_at_period_end')}
                </div>
              )}
            </div>

            <aside className="learning-card p-6 md:p-8">
              <h2 className="text-3xl font-semibold text-slate-900">{t('learning.subscription_details')}</h2>

              <div className="mt-6 space-y-3">
                <div className="learning-subtle-card flex gap-3 p-4">
                  <CalendarClock className="mt-0.5 size-5 shrink-0 text-[#0000FF]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t(dateLabelKey)}</p>
                    <p className="mt-1 text-sm text-slate-600">{formattedDisplayEndDate}</p>
                  </div>
                </div>
                <div className="learning-subtle-card flex gap-3 p-4">
                  <RefreshCw className="mt-0.5 size-5 shrink-0 text-[#0000FF]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('learning.next_billing_date')}</p>
                    <p className="mt-1 text-sm text-slate-600">{nextChargeCopy}</p>
                  </div>
                </div>
                <div className="learning-subtle-card flex gap-3 p-4">
                  <CreditCard className="mt-0.5 size-5 shrink-0 text-[#0000FF]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('learning.payment_method')}</p>
                    <p className="mt-1 text-sm text-slate-600">{details.paymentMethod?.label || '--'}</p>
                  </div>
                </div>
                <div className="learning-subtle-card flex gap-3 p-4">
                  <CalendarClock className="mt-0.5 size-5 shrink-0 text-[#0000FF]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('learning.billing_cycle')}</p>
                    <p className="mt-1 text-sm text-slate-600">{billingIntervalLabel}</p>
                  </div>
                </div>
                <div className="learning-subtle-card flex gap-3 p-4">
                  <RefreshCw className="mt-0.5 size-5 shrink-0 text-[#0000FF]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{subscription.cancelAtPeriodEnd ? t('learning.reactivate') : t('learning.cancellation')}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {subscription.cancelAtPeriodEnd ? t('learning.subscription_reactivation_hint') : t('learning.subscription_cancellation_hint')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-semibold text-slate-900">{t('learning.invoices')}</h3>
                <div className="mt-4 space-y-3">
                  {(details.invoices || []).length > 0 ? details.invoices.map((invoice) => (
                    <a
                      key={invoice.id}
                      href={invoice.invoicePdf || invoice.hostedInvoiceUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="learning-inline-card flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-700 transition-colors hover:border-[#0000FF]/25"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{invoice.number || invoice.id}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(invoice.createdAt, locale)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{formatLearningPrice(invoice.amountPaid || invoice.amountDue, invoice.currency, locale)}</span>
                        <Download className="size-4 text-[#0000FF]" />
                      </div>
                    </a>
                  )) : (
                    <div className="rounded-[8px] border border-dashed border-black/10 bg-[#f7f7f7] p-4 text-sm text-slate-500">
                      {t('learning.no_invoices')}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {subscriptionStatus !== 'expired' && (
                  <Button
                    type="button"
                    onClick={() => handlePortal(subscription.cancelAtPeriodEnd ? '' : 'cancel')}
                    disabled={portalLoading}
                    className="h-11 w-full rounded-[8px] bg-[#0000FF] text-white shadow-none hover:bg-[#0000CC]"
                  >
                    {portalLoading ? t('common.loading') : portalActionLabel}
                  </Button>
                )}

                {details.package.checkoutEnabled !== false ? (
                  <Button asChild variant="outline" className="h-11 w-full rounded-[8px] border-black/10 bg-white text-slate-700 shadow-none hover:bg-slate-50">
                    <Link to={`/learning/subscribe/${details.package.slug}`}>{subscriptionStatus === 'unpaid' || subscriptionStatus === 'expired' ? t('learning.subscribe_again') : t('learning.renew_subscription')}</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="h-11 w-full cursor-not-allowed rounded-[8px] border-black/10 bg-slate-100 text-slate-500 opacity-100 shadow-none hover:bg-slate-100"
                  >
                    {t('learning.checkout_disabled_cta')}
                  </Button>
                )}
              </div>
            </aside>
          </section>
        </div>
      </AccountLayout>
    </>
  );
};

export default LearningSubscriptionPage;
