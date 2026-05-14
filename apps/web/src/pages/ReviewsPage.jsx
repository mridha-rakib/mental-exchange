import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReviewCard from '@/components/ReviewCard.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PageShell } from '@/components/PageShell.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { listCustomerReviews } from '@/lib/reviewsApi.js';

const PAGE_SIZE = 12;

const ReviewsPage = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');

    listCustomerReviews({ featured: false, limit: PAGE_SIZE, page })
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setReviews(result.items);
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages || 1));
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setReviews([]);
        setTotal(0);
        setTotalPages(1);
        setError(t('reviews.load_error'));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, t]);

  const canGoPrevious = page > 1 && !isLoading;
  const canGoNext = page < totalPages && !isLoading;

  return (
    <>
      <Helmet>
        <title>{t('reviews.title')} - Zahnibörse</title>
      </Helmet>

      <PageShell
        eyebrow="Zahnibörse"
        title={t('reviews.title')}
        description={t('reviews.all_subtitle')}
        maxWidth="max-w-7xl"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              {t('reviews.back_home')}
            </Link>
          </Button>

          <p className="text-sm text-[hsl(var(--secondary-text))]">
            {t('reviews.total_count', { count: total })}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && reviews.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-[260px] animate-pulse rounded-[8px] border border-[hsl(var(--border))] bg-white" />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                verifiedLabel={t('reviews.verified_buyer')}
                customerLabel={t('reviews.customer')}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-[hsl(var(--border))] bg-white p-8 text-center text-[hsl(var(--secondary-text))]">
            {t('reviews.empty')}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button
              type="button"
              variant="outline"
              disabled={!canGoPrevious}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('reviews.previous')}
            </Button>
            <span className="text-center text-sm text-[hsl(var(--secondary-text))]">
              {t('reviews.page_status', { page, totalPages })}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={!canGoNext}
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            >
              {t('reviews.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </PageShell>
    </>
  );
};

export default ReviewsPage;
