import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenText, CheckCircle2, LockKeyhole, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { getLearningModule, getLearningModuleBySlug } from '@/lib/learningApi.js';
import { localizeLearningModulePayload } from '@/lib/learningContentLocalization.js';
import {
  getLearningTopicStatusLabel,
  getLearningTopicStatusToneClass,
  getMinutesLabel,
} from '@/lib/learningPresentation.js';
import { getLearningSubtopicPath } from '@/lib/learningRoutes.js';
import {
  getSubscriptionNoAccessBodyKey,
  getSubscriptionNoAccessTitleKey,
} from '@/lib/subscriptionStatus.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const LearningModulePage = () => {
  const { moduleId, packageSlug, topicSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, language } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(null);

  useEffect(() => {
    let active = true;
    const token = pb.authStore.token;

    const loadModule = async () => {
      try {
        const result = topicSlug
          ? await getLearningModuleBySlug({ token, packageSlug, topicSlug })
          : await getLearningModule({ token, moduleId });
        if (active) {
          setData(localizeLearningModulePayload(result, language));
          setAccessDenied(null);
        }
      } catch (error) {
        console.error('Failed to load learning module:', error);
        if (active && [401, 403].includes(error.status)) {
          setAccessDenied({
            packageSlug: error.data?.packageSlug || '',
            status: error.data?.subscription?.status || '',
          });
        } else {
          toast.error(error.message || t('learning.load_error'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadModule();

    return () => {
      active = false;
    };
  }, [language, moduleId, navigate, packageSlug, t, topicSlug]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] text-slate-500">{t('common.loading')}</div>;
  }

  if (!data?.module) {
    if (accessDenied) {
      const noAccessTitle = t(getSubscriptionNoAccessTitleKey(accessDenied.status));
      const noAccessBody = t(getSubscriptionNoAccessBodyKey(accessDenied.status));

      return (
        <main className="learning-shell flex-1">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <section className="learning-card mx-auto max-w-3xl p-8 text-center md:p-10">
              <Badge className="rounded-[8px] bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0000FF] shadow-none">
                {t('learning.status_locked')}
              </Badge>
              <h1 className="mt-5 text-3xl font-bold text-slate-900">{noAccessTitle}</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">{noAccessBody}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild className="h-11 rounded-[8px] bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]">
                  <Link to={accessDenied.packageSlug ? `/learning/subscribe/${accessDenied.packageSlug}` : '/learning'}>
                    {['expired', 'unpaid', 'paused'].includes(accessDenied.status) ? t('learning.subscribe_again') : t('learning.subscribe')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-[8px] border-black/10 bg-white px-6 text-slate-700 shadow-none hover:bg-slate-50">
                  <Link to={isAuthenticated ? '/profile' : '/auth'}>{isAuthenticated ? t('nav.profile') : t('nav.login')}</Link>
                </Button>
              </div>
            </section>
          </div>
        </main>
      );
    }

    return <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] text-slate-500">{t('learning.package_not_found')}</div>;
  }

  return (
    <>
      <Helmet>
        <title>{`${data.module.title} - ${t('nav.learning')} - Zahnibörse`}</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Helmet>

      <main className="learning-shell flex-1">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 md:py-16">
          <Link to={isAuthenticated ? '/learning/dashboard' : `/learning/packages/${data.package?.slug || ''}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-[#0000FF]">
            <ArrowLeft className="size-4" />
            {isAuthenticated ? t('learning.dashboard') : t('common.back')}
          </Link>

          <section className="learning-card mt-6 p-7 md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/75">{data.package?.title}</p>
                  {Number(data.module.position || 0) > 0 && (
                    <Badge className="rounded-[8px] bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 shadow-none">
                      {t('learning.module_order')} {data.module.position}
                    </Badge>
                  )}
                </div>
                <h1 className="mt-3 text-4xl font-bold text-slate-900">{data.module.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{data.module.description}</p>
              </div>
              <Badge className="rounded-[8px] bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0000FF] shadow-none">
                {data.module.lessons.length} {t('learning.lessons_count')}
              </Badge>
              <Badge className={`rounded-[8px] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-none ${getLearningTopicStatusToneClass(data.module.progress?.topicStatus || data.module.progress?.status)}`}>
                {getLearningTopicStatusLabel(t, data.module.progress?.topicStatus || data.module.progress?.status)}
              </Badge>
            </div>
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                <span>{t('learning.progress')}</span>
                <span>{data.module.progress?.completedLessons || 0}/{data.module.progress?.totalLessons || data.module.lessons.length}</span>
              </div>
              <div className="learning-progress-track mt-3">
                <div className="learning-progress-fill" style={{ width: `${data.module.progress?.percent || 0}%` }} />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {data.module.lessons.map((lesson, index) => (
                <article key={lesson.id} className="learning-subtle-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {t('learning.lesson_order')} {index + 1}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{lesson.title}</h2>
                        {lesson.unlocked ? (
                          <Badge className="rounded-[8px] bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 shadow-none">
                        {lesson.progress?.status === 'completed' ? t('learning.status_completed') : (data.viewer?.isPreviewOnly ? t('learning.preview_label') : t('learning.status_unlocked'))}
                          </Badge>
                        ) : (
                          <Badge className="rounded-[8px] bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-none">
                            {t('learning.status_locked')}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.description}</p>
                      <p className="mt-3 text-xs text-slate-500">{getMinutesLabel(t, lesson.estimatedMinutes)}</p>
                    </div>
                    <div className="rounded-[8px] bg-white p-3 text-[#0000FF]">
                      {lesson.unlocked ? <PlayCircle className="size-4" /> : <LockKeyhole className="size-4 text-slate-400" />}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {lesson.unlocked ? (
                      <Button asChild className="h-10 rounded-[8px] bg-[#0000FF] px-5 text-white shadow-none hover:bg-[#0000CC]">
                        <Link to={getLearningSubtopicPath(data.package, data.module, lesson)}>
                          <BookOpenText className="size-4" />
                          {data.viewer?.isPreviewOnly ? t('learning.open_preview') : t('learning.open_lesson')}
                        </Link>
                      </Button>
                    ) : (
                      <div className="inline-flex h-10 items-center rounded-[8px] border border-black/10 bg-white px-5 text-sm font-medium text-slate-500">
                        {t('learning.complete_previous')}
                      </div>
                    )}

                    {lesson.progress?.status === 'completed' && (
                      <div className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-5 text-sm font-medium text-emerald-700">
                        <CheckCircle2 className="size-4" />
                        {t('learning.status_completed')}
                      </div>
                    )}
                  </div>

                  {lesson.unlocked && data.viewer?.canSaveProgress && (
                    <div className="learning-progress-track mt-4">
                      <div className="learning-progress-fill" style={{ width: `${lesson.progress?.progressPercentage || 0}%` }} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default LearningModulePage;
