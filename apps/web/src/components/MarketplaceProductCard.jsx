import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useFavorites } from '@/contexts/FavoritesContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getProductImageUrl } from '@/lib/productImages.js';
import { toast } from 'sonner';

const conditionLabelKeys = {
  Neu: 'marketplace.condition_new',
  'Wie neu': 'marketplace.condition_like_new',
  Gut: 'marketplace.condition_good',
  Befriedigend: 'marketplace.condition_satisfactory',
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
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const isShopProduct = product.source === 'shop' || product.collectionName === 'shop_products';
  const productLink = `/product/${product.id}${isShopProduct ? '?type=shop' : ''}`;
  const productImageUrl = getProductImageUrl(product);
  const isSold = !isShopProduct && product.status === 'sold';
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

  const formatPrice = (value) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value) || 0);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSold) return;

    addToCart(product, 1, isShopProduct ? 'shop' : 'marketplace');
    toast.success(t('product.added_to_cart'));
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast.error(t('auth.login_required_favorites'));
      navigate('/auth');
      return;
    }

    try {
      if (isFav) {
        await removeFromFavorites(product.id);
        toast.success(t('common.remove_favorite'));
      } else {
        await addToFavorites(product);
        toast.success(t('common.favorite_added'));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(t('common.favorites_update_error'));
    }
  };

  return (
    <article className="group flex h-[272px] min-w-0 flex-col overflow-hidden rounded-[10px] border border-[#d8d8d8] bg-white transition-colors duration-200 hover:border-[#0000FF]/35">
      <div className="relative bg-[#f3f3f3]">
        <Link to={productLink} className="block">
          <div className="relative h-[130px] overflow-hidden">
            {productImageUrl ? (
              <img
                src={productImageUrl}
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
            <span className="rounded-[6px] bg-slate-950 px-3 py-1.5 text-[11px] font-semibold uppercase text-white">
              {t('product.sold')}
            </span>
          </div>
        )}

        {product.condition && (
          <span className="absolute left-2 top-2 z-10 rounded-[4px] bg-white/92 px-2 py-1 text-[10px] font-semibold text-[#666] shadow-sm">
            {conditionLabel}
          </span>
        )}

        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/92 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-[#0000FF]"
          aria-label={isFav ? t('common.remove_favorite') : t('common.favorite_added')}
        >
          <Heart size={15} className={isFav ? 'fill-[#0000FF] text-[#0000FF]' : ''} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
        <div className="min-w-0 truncate text-[12px] font-medium text-[#666]">
          {isShopProduct ? t('popular.official') : product.seller_username || t('product.anonymous_seller')}
        </div>

        <Link to={productLink} className="mt-2 block">
          <h3 className="line-clamp-2 min-h-[44px] font-serif text-[16px] font-semibold leading-[1.35] text-[#333] transition-colors group-hover:text-[#0000FF]">
            {productTitle}
          </h3>
        </Link>

        {subjectAreas.length > 0 && (
          <p className="mt-1 truncate text-[11px] text-slate-500">{t(subjectLabelKeys[subjectAreas[0]] || 'marketplace.subject_paro')}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <p className="whitespace-nowrap text-[20px] font-bold text-[#0000FF]">{formatPrice(product.price)}</p>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSold}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[#333] transition-colors hover:bg-[#0000FF] hover:text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            aria-label={t('product.add_to_cart')}
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default MarketplaceProductCard;
