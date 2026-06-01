import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { listLearningPackages } from '@/lib/learningApi.js';
import { localizeLearningPackageList } from '@/lib/learningContentLocalization.js';
import { getPriceIntervalLabel } from '@/lib/learningPresentation.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const getCurrentUrl = () => (typeof window !== 'undefined' ? window.location.href : '');

const LearningLandingPage = () => {
  const { t, language } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      try {
        const data = await listLearningPackages();
        if (active) {
          setPackages(localizeLearningPackageList(Array.isArray(data.items) ? data.items : [], language));
        }
      } catch (error) {
        console.error('Failed to load learning packages:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPackages();

    return () => {
      active = false;
    };
  }, [language]);

  const locale = language === 'DE' ? 'de-DE' : 'en-US';
  const featuredPackage = packages[0] || null;
  const pageTitle = featuredPackage?.seoTitle || featuredPackage?.title || t('learning.meta_title');
  const pageDescription = featuredPackage?.seoDescription || featuredPackage?.heroCopy || t('learning.meta_description');
  const ogTitle = featuredPackage?.ogTitle || pageTitle;
  const ogDescription = featuredPackage?.ogDescription || pageDescription;
  const ogImage = featuredPackage?.ogImageUrl || featuredPackage?.heroImageUrl || featuredPackage?.thumbnailUrl || '';
  const canonicalUrl = getCurrentUrl();

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index,follow" />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {ogImage && <meta property="og:image" content={ogImage} />}
      </Helmet>

      <main className="learning-shell flex-1">
        {featuredPackage && (
          <section className="border-b border-black/5 bg-white py-14 md:py-16">
            <div className="container mx-auto grid gap-8 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
              <div className="learning-card p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">{t('learning.target_audience')}</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">{t('learning.target_audience')}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{featuredPackage.targetAudience}</p>

                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">{t('learning.what_included')}</p>
                  <div className="mt-4 space-y-3">
                    {(featuredPackage.includedContent || []).map((item) => (
                      <div key={item} className="learning-subtle-card flex gap-3 p-4">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0000FF]" />
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="learning-card p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">{t('learning.faq')}</p>
                    <h2 className="mt-3 text-3xl font-bold text-slate-900">{t('learning.faq')}</h2>
                  </div>
                  <Button asChild className="h-11 rounded-[8px] bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]">
                    <Link to="/learning/packages">
                      {t('learning.subscribe')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  {(featuredPackage.faq || []).map((item) => (
                    <div key={item.question} className="learning-inline-card p-4">
                      <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="py-14 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">{t('learning.overview')}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{t('learning.explore')}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{t('learning.meta_description')}</p>
            </div>

            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[8px] border border-black/6 bg-white">
                    <div className="aspect-[4/3] animate-pulse bg-slate-200" />
                    <div className="space-y-3 p-6">
                      <div className="h-5 w-2/3 animate-pulse rounded-[8px] bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded-[8px] bg-slate-200" />
                      <div className="h-4 w-4/5 animate-pulse rounded-[8px] bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : packages.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {packages.map((item) => (
                  <article key={item.id} className="learning-card overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden bg-[#f3f3f3]">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">{item.title}</div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-900">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.subtitle}</p>
                        </div>
                        <Badge className="rounded-[8px] bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0000FF] shadow-none">
                          {getPriceIntervalLabel(t, item.priceAmount, item.currency, item.billingInterval, locale)}
                        </Badge>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                        <span className="rounded-[8px] bg-slate-100 px-3 py-1">{item.moduleCount} {t('learning.modules_count')}</span>
                        <span className="rounded-[8px] bg-slate-100 px-3 py-1">{item.lessonCount} {t('learning.lessons_count')}</span>
                      </div>

                      <Button asChild className="mt-6 h-11 w-full rounded-[8px] bg-[#0000FF] text-white shadow-none hover:bg-[#0000CC]">
                        <Link to={`/learning/packages/${item.slug}`}>{t('learning.explore')}</Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[8px] border border-dashed border-black/12 bg-white p-10 text-center text-slate-600">
                {t('learning.no_packages')}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default LearningLandingPage;
