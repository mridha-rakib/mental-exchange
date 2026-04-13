import React from 'react';
import { Helmet } from 'react-helmet';
import { Leaf, ShieldCheck, Users } from 'lucide-react';
import { ContentPanel, PageShell, ProseBlock } from '@/components/PageShell.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const values = [
  {
    icon: Users,
    titleKey: 'about.value_students_title',
    textKey: 'about.value_students_body',
  },
  {
    icon: ShieldCheck,
    titleKey: 'about.value_secure_title',
    textKey: 'about.value_secure_body',
  },
  {
    icon: Leaf,
    titleKey: 'about.value_sustainable_title',
    textKey: 'about.value_sustainable_body',
  },
];

const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('about.title')} - Zahnibörse</title>
      </Helmet>

      <PageShell
        eyebrow="Zahnibörse"
        title={t('about.title')}
        description={t('about.description')}
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ContentPanel>
            <ProseBlock>
              <p>
                {t('about.paragraph_1')}
              </p>
              <p>
                {t('about.paragraph_2')}
              </p>
              <p>
                {t('about.paragraph_3')}
              </p>
            </ProseBlock>
          </ContentPanel>

          <div className="space-y-4">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.titleKey} className="rounded-[8px] border border-[hsl(var(--border))] bg-white p-5 shadow-card">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50 text-[#0000FF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold">{t(item.titleKey)}</h2>
                  <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{t(item.textKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </PageShell>
    </>
  );
};

export default AboutPage;
