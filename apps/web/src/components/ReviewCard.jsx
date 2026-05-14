import React from 'react';
import { Star } from 'lucide-react';

const normalizeReviewText = (text) => String(text || '').replace(/^"+|"+$/g, '');

const ReviewCard = ({ review, verifiedLabel, customerLabel }) => {
  const rating = Math.max(0, Math.min(5, Number(review.rating || 0)));

  return (
    <article className="flex h-full flex-col rounded-[8px] border border-[hsl(var(--border))] bg-[rgba(247,247,247,0.2)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-smooth hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] md:p-8">
      <div className="mb-4 flex items-center gap-1 md:mb-6" aria-label={`${rating} out of 5 stars`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`md:h-[20px] md:w-[20px] ${i < rating ? 'fill-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'fill-[hsl(var(--border))] text-[hsl(var(--border))]'}`}
          />
        ))}
      </div>

      <blockquote className="mb-6 flex-grow text-[14px] leading-[1.6] text-[hsl(var(--foreground))] md:mb-8 md:text-[16px]">
        "{normalizeReviewText(review.body)}"
      </blockquote>

      <div className="mt-auto flex items-center gap-3 md:gap-4">
        <div className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-full bg-[rgba(0,0,255,0.1)] md:h-[40px] md:w-[40px]">
          <span className="font-['Playfair_Display'] text-[14px] font-bold text-[hsl(var(--primary))] md:text-[16px]">
            {review.initials || '?'}
          </span>
        </div>
        <div>
          <div className="text-[14px] font-medium text-[hsl(var(--foreground))] md:text-[16px]">
            {review.displayName}
          </div>
          <div className="text-[12px] text-[hsl(var(--secondary))] md:text-[14px]">
            {review.verifiedBuyer ? verifiedLabel : customerLabel}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ReviewCard;
