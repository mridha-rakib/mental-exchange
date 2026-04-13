import React from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const CustomerReviewsSection = () => {
  const { t } = useTranslation();
  const reviews = [
    {
      id: 1,
      name: 'Laura M.',
      rating: 5,
      text: t('reviews.review_1'),
      initial: 'L'
    },
    {
      id: 2,
      name: 'Dr. Schmidt',
      rating: 5,
      text: t('reviews.review_2'),
      initial: 'S'
    },
    {
      id: 3,
      name: 'Julian K.',
      rating: 4,
      text: t('reviews.review_3'),
      initial: 'J'
    }
  ];

  return (
    <section className="bg-white py-16 md:py-24 px-4 md:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-[768px] mx-auto mb-10 md:mb-16">
          <h2 className="font-['Playfair_Display'] font-bold text-[30px] md:text-[36px] lg:text-[48px] text-[hsl(var(--foreground))] mb-4">
            {t('reviews.title')}
          </h2>
          <p className="text-[16px] md:text-[18px] text-[hsl(var(--secondary))]">
            {t('reviews.subtitle')}
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="flex flex-col h-full bg-[rgba(247,247,247,0.2)] border border-[hsl(var(--border))] rounded-[8px] p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-smooth"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4 md:mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={16} 
                    className={`md:w-[20px] md:h-[20px] ${i < review.rating ? 'fill-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'fill-[hsl(var(--border))] text-[hsl(var(--border))]'}`} 
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="flex-grow text-[14px] md:text-[16px] text-[hsl(var(--foreground))] leading-[1.6] mb-6 md:mb-8">
                "{review.text}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 md:gap-4 mt-auto">
                <div className="w-[32px] h-[32px] md:w-[40px] md:h-[40px] rounded-full bg-[rgba(0,0,255,0.1)] flex items-center justify-center flex-shrink-0">
                  <span className="font-['Playfair_Display'] font-bold text-[14px] md:text-[16px] text-[hsl(var(--primary))]">
                    {review.initial}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-[14px] md:text-[16px] text-[hsl(var(--foreground))]">
                    {review.name}
                  </div>
                  <div className="text-[12px] md:text-[14px] text-[hsl(var(--secondary))]">
                    {t('reviews.verified_buyer')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CustomerReviewsSection;
