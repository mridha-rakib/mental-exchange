import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useFavorites } from '@/contexts/FavoritesContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getAuthToken } from '@/lib/getAuthToken.js';
import { toast } from 'sonner';

const conditionLabelKeys = {
  Neu: 'marketplace.condition_new',
  'Wie neu': 'marketplace.condition_like_new',
  Gut: 'marketplace.condition_good',
  Befriedigend: 'marketplace.condition_satisfactory',
};

const productTypeLabelKeys = {
  Article: 'marketplace.type_article',
  Set: 'marketplace.type_set',
  Consumable: 'marketplace.type_consumable',
};

const subjectLabelKeys = {
  Kons: 'marketplace.subject_kons',
  Pro: 'marketplace.subject_pro',
  KFO: 'marketplace.subject_kfo',
  Paro: 'marketplace.subject_paro',
};

const MarketplaceProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { currentUser } = useAuth();
  const { isFavorite, loadFavorites } = useFavorites();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const isSold = product.status === 'sold';
  const isFav = isFavorite(product.id);
  const productTitle = product.name || product.title || t('product.untitled');
  const subjectAreas = Array.isArray(product.fachbereich)
    ? product.fachbereich.filter(Boolean)
    : product.fachbereich
      ? [product.fachbereich]
      : [];
  const conditionLabel = product.condition
    ? t(conditionLabelKeys[product.condition] || 'marketplace.condition_good')
    : t('marketplace.condition');
  const productTypeLabel = t(productTypeLabelKeys[product.product_type] || 'marketplace.type_article');

  const pickNumber = (...values) => {
    for (const value of values) {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) return numericValue;
    }
    return null;
  };

  const rawRating = pickNumber(
    product.rating,
    product.average_rating,
    product.averageRating,
    product.review_rating,
    product.reviewRating
  );
  const rawReviewCount = pickNumber(
    product.review_count,
    product.reviewCount,
    product.reviews_count,
    product.reviewsCount,
    product.rating_count,
    product.ratingCount
  );
  const rating = rawRating === null ? null : Math.min(5, Math.max(0, rawRating));
  const reviewCount = rawReviewCount === null ? 0 : Math.max(0, rawReviewCount);
  const hasRating = rating !== null && rating > 0;
  const filledStars = hasRating ? Math.round(rating) : 0;
  const reviewLabel = hasRating
    ? reviewCount > 0
      ? `${rating.toFixed(1)} (${reviewCount})`
      : rating.toFixed(1)
    : t('product.no_reviews');

  const formatPrice = (value) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value) || 0);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSold) return;

    addToCart(product, 1);
    toast.success(t('product.added_to_cart'));
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token = getAuthToken();
    if (!token || !currentUser) {
      toast.error(t('auth.login_required_favorites'));
      navigate('/auth');
      return;
    }

    try {
      const response = await apiServerClient.fetch('/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id }),
      });

      if (response.status === 401) {
        toast.error(t('auth.session_expired'));
        navigate('/auth');
        return;
      }

      if (!response.ok) throw new Error('Toggle failed');

      await loadFavorites();
      toast.success(isFav ? t('common.remove_favorite') : t('common.favorite_added'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(t('common.favorites_update_error'));
    }
  };

  return (
    <article className="group flex h-full min-h-[430px] flex-col overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-colors duration-200 hover:border-[#0000FF]/35 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
      <div className="relative border-b border-slate-100 bg-[#f3f6f8]">
        <Link to={`/product/${product.id}`} className="block">
          <div className="relative aspect-[4/3] overflow-hidden">
            {product.image ? (
              <img
                src={pb.files.getUrl(product, product.image)}
                alt={productTitle}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
                {t('product.no_image')}
              </div>
            )}
          </div>
        </Link>

        {isSold && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
            <span className="rounded-[8px] bg-slate-950 px-4 py-2 text-xs font-semibold uppercase text-white">
              {t('product.sold')}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/70 bg-white/92 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-[#0000FF]"
          aria-label={isFav ? t('common.remove_favorite') : t('common.favorite_added')}
        >
          <Heart size={16} className={isFav ? 'fill-[#0000FF] text-[#0000FF]' : ''} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="line-clamp-2 min-h-[62px] text-[22px] font-semibold leading-7 text-slate-950 transition-colors group-hover:text-[#0000FF]">
            {productTitle}
          </h3>
        </Link>

        <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium text-slate-600">
            {product.seller_username || t('product.anonymous_seller')}
          </p>

          <div
            className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
            aria-label={reviewLabel}
          >
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={`${product.id}-star-${star}`}
                  size={13}
                  className={
                    star <= filledStars
                      ? 'fill-amber-400 text-amber-400'
                      : hasRating
                        ? 'fill-white text-amber-200'
                        : 'fill-slate-100 text-slate-300'
                  }
                />
              ))}
            </span>
            <span className="whitespace-nowrap">{reviewLabel}</span>
          </div>
        </div>

        <div className="mb-5 mt-4 flex min-h-8 flex-wrap gap-2">
          <span className="rounded-[8px] border border-[#0000FF]/15 bg-[#f4f6ff] px-2.5 py-1 text-xs font-semibold text-[#0000FF]">
            {productTypeLabel}
          </span>
          <span className="rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {conditionLabel}
          </span>
          {subjectAreas.slice(0, 1).map((subject) => (
            <span
              key={`${product.id}-${subject}`}
              className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {t(subjectLabelKeys[subject] || 'marketplace.subject_paro')}
            </span>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{t('seller.price')}</p>
              <p className="mt-1 whitespace-nowrap text-xl font-bold text-slate-950">{formatPrice(product.price)}</p>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSold}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#0000FF] text-white transition-colors hover:bg-[#0000CC] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              aria-label={t('product.add_to_cart')}
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MarketplaceProductCard;
