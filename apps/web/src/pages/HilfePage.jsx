import React from 'react';
import { Helmet } from 'react-helmet';
import { PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { ContentPanel, PageShell, ProseBlock } from '@/components/PageShell.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const HilfePage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('help.title')} - Zahnibörse</title>
      </Helmet>

      <PageShell
        eyebrow="Support"
        title={t('help.title')}
        description={t('help.description')}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <ContentPanel className="lg:col-span-2">
            <ProseBlock>
              <section>
                <div className="mb-3 flex items-center gap-3">
                  <Truck className="h-5 w-5 text-[#0000FF]" />
                  <h2 className="text-xl font-semibold text-gray-900">{t('shipping.title')}</h2>
                </div>
                <p>
                  {t('help.shipping_body')}
                </p>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-[#0000FF]" />
                  <h2 className="text-xl font-semibold text-gray-900">{t('help.returns_title')}</h2>
                </div>
                <p>
                  {t('help.returns_body')}
                </p>
              </section>
            </ProseBlock>
          </ContentPanel>

          <div className="rounded-[8px] border border-[hsl(var(--border))] bg-white p-6 shadow-card">
            <PackageCheck className="mb-4 h-8 w-8 text-[#0000FF]" />
            <h2 className="mb-3 text-lg font-semibold">{t('help.labels_title')}</h2>
            <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">
              {t('help.labels_body')}
            </p>
          </div>
        </div>
      </PageShell>
    </>
  );
};

export default HilfePage;
