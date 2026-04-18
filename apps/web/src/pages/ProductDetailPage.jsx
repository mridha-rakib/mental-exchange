import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Heart, PackageCheck, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useCart } from '@/contexts/CartContext.jsx';
import { useFavorites } from '@/contexts/FavoritesContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';

const subjectKeys = {
  Kons: 'marketplace.subject_kons',
  Pro: 'marketplace.subject_pro',
  KFO: 'marketplace.subject_kfo',
  Paro: 'marketplace.subject_paro',
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { t, language } = useTranslation();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const productSource = searchParams.get('type') === 'shop' ? 'shop' : 'marketplace';

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);

      try {
        const collectionName = productSource === 'shop' ? 'shop_products' : 'products';
        const record = await pb.collection(collectionName).getOne(id, { $autoCancel: false });
        setProduct(record);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error(t('product.load_error'));
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, productSource, t]);

  const formatPrice = (price) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(price) || 0);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] flex-1 items-center justify-center bg-[linear-gradient(180deg,#f7f5ef_0%,#ffffff_100%)]">
        <div className="text-sm font-medium text-slate-500">{t('common.loading')}</div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-[70vh] flex-1 items-center justify-center bg-[linear-gradient(180deg,#f7f5ef_0%,#ffffff_100%)]">
        <div className="text-sm font-medium text-slate-500">{t('product.not_found')}</div>
      </main>
    );
  }

  const isShopProduct = productSource === 'shop';
  const isSold = !isShopProduct && product.status === 'sold';
  const isPending = product.status === 'pending_verification';
  const isFav = !isShopProduct && isFavorite(product.id);
  const subjectAreas = Array.isArray(product.fachbereich)
    ? product.fachbereich.filter(Boolean)
    : product.fachbereich
      ? [product.fachbereich]
      : [];

  const sellerLabel = isShopProduct ? t('product.shop_seller') : (product.seller_username || t('product.anonymous_seller'));

  const handleFavoriteToggle = async () => {
    if (isShopProduct) return;

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
        await addToFavorites(product.id);
        toast.success(t('product.added_to_favorites'));
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
      toast.error(t('common.favorites_update_error'));
    }
  };

  const handleAddToCart = () => {
    addToCart(product, 1, isShopProduct ? 'shop' : 'marketplace');
    toast.success(t('product.added_to_cart'));
  };

  return (
    <>
      <Helmet>
        <title>{product.name} - Zahniboerse</title>
      </Helmet>

      <main className="flex-1 bg-[linear-gradient(180deg,#f7f5ef_0%,#fcfbf8_24%,#ffffff_100%)] py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#0000FF]"
          >
            <ArrowLeft size={16} />
            {t('product.back')}
          </button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_420px] xl:gap-10">
            <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white">
              <div className="relative aspect-square overflow-hidden bg-[#f6f1e8]">
                {product.image ? (
                  <img src={pb.files.getUrl(product, product.image)} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
                    {t('product.no_image')}
                  </div>
                )}

                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-none">
                    {isShopProduct ? t('popular.official') : t('nav.marketplace')}
                  </Badge>

                  {product.condition && (
                    <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                      {product.condition}
                    </Badge>
                  )}
                </div>

                {isSold && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/74 backdrop-blur-[2px]">
                    <span className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                      {t('product.sold')}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-5">
              <div className="rounded-[32px] border border-black/5 bg-white p-6 md:p-7">
                <div className="flex flex-wrap gap-2">
                  {subjectAreas.map((subject) => (
                    <span
                      key={`${product.id}-${subject}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {t(subjectKeys[subject] || 'marketplace.subject_paro')}
                    </span>
                  ))}
                </div>

                <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
                  {product.name}
                </h1>

                <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {isShopProduct ? t('popular.verified') : t('marketplace.condition')}
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900 md:text-4xl">
                      {formatPrice(product.price)}
                    </p>
                  </div>

                  <div className="rounded-full bg-[#0000FF]/8 px-4 py-2 text-sm font-medium text-[#0000FF]">
                    {sellerLabel}
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] bg-slate-50 p-5">
                  <p className="text-sm leading-7 text-slate-600">
                    {product.description || t('product.no_description')}
                  </p>
                </div>

                {isPending && (
                  <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="text-sm leading-6">
                      <strong>{t('product.pending_title')}</strong> {t('product.pending_note')}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <Button
                    size="lg"
                    className="h-12 flex-1 rounded-full bg-[#0000FF] text-base text-white shadow-none hover:bg-[#0000CC]"
                    disabled={isSold || isPending}
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {isPending ? t('product.pending') : t('product.add_to_cart')}
                  </Button>

                  {!isShopProduct && (
                    <Button
                      size="lg"
                      variant="outline"
                      className={`h-12 w-12 rounded-full border-black/10 p-0 shadow-none ${
                        isFav ? 'border-red-200 bg-red-50 text-red-500' : 'bg-white text-slate-600'
                      }`}
                      onClick={handleFavoriteToggle}
                    >
                      <Heart className={isFav ? 'fill-current' : ''} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[28px] border border-black/5 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{t('info.secure_title')}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{t('info.secure_body')}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                      <PackageCheck className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{t('cart.shipping')}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{t('info.simple_body')}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{t('popular.verified')}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {isShopProduct ? t('shop.subtitle') : t('product.rating_summary')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProductDetailPage;
