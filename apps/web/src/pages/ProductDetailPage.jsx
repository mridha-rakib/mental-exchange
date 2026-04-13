import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ShoppingCart, Heart, ShieldCheck, ArrowLeft, Star, AlertCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useFavorites } from '@/contexts/FavoritesContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { toast } from 'sonner';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { t } = useTranslation();

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

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">{t('product.not_found')}</div>;

  const isShopProduct = productSource === 'shop';
  const isSold = !isShopProduct && product.status === 'sold';
  const isPending = product.status === 'pending_verification';
  const isFav = !isShopProduct && isFavorite(product.id);

  const handleFavoriteToggle = () => {
    if (isShopProduct) return;

    if (isFav) {
      removeFromFavorites(product.id);
      toast.success(t('common.remove_favorite'));
    } else {
      addToFavorites(product.id);
      toast.success(t('product.added_to_favorites'));
    }
  };

  return (
    <>
      <Helmet>
        <title>{product.name} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[hsl(var(--secondary-text))] hover:text-[hsl(var(--primary))] mb-8 transition-colors">
            <ArrowLeft size={20} /> {t('product.back')}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="relative aspect-square bg-[hsl(var(--muted-bg))] rounded-[var(--radius-lg)] overflow-hidden border border-[hsl(var(--border))]">
              {product.image ? (
                <img src={pb.files.getUrl(product, product.image)} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">{t('product.no_image')}</div>
              )}
              {isSold && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                  <span className="bg-gray-900 text-white px-6 py-3 rounded-full text-lg font-bold tracking-wider">{t('product.sold')}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-[hsl(var(--muted-bg))] text-[hsl(var(--foreground))] px-3 py-1 rounded-full text-sm font-medium border border-[hsl(var(--border))]">
                  {product.condition}
                </span>
                {product.fachbereich?.map(fb => (
                  <span key={fb} className="bg-blue-50 text-[hsl(var(--primary))] px-3 py-1 rounded-full text-sm font-medium">
                    {fb}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
              <div className="text-3xl font-bold text-[hsl(var(--primary))] mb-8">€{product.price.toFixed(2)}</div>

              <div className="prose max-w-none text-[hsl(var(--secondary-text))] mb-8">
                <p>{product.description || t('product.no_description')}</p>
              </div>

              <div className="bg-[hsl(var(--muted-bg))] rounded-[var(--radius-md)] p-4 mb-8 flex items-center justify-between border border-[hsl(var(--border))]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-[hsl(var(--primary))] font-bold text-xl">
                    {(isShopProduct ? 'Z' : (product.seller_username || 'A'))[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{isShopProduct ? t('product.shop_seller') : (product.seller_username || t('product.anonymous_seller'))}</div>
                    <div className="flex items-center text-sm text-[hsl(var(--secondary-text))]">
                      <Star size={14} className="fill-yellow-400 text-yellow-400 mr-1" /> {t('product.rating_summary')}
                    </div>
                  </div>
                </div>
                <ShieldCheck className="text-green-500" size={24} />
              </div>

              <div className="flex flex-col gap-4 mt-auto">
                {isPending && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      <strong>{t('product.pending_title')}</strong> {t('product.pending_note')}
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    size="lg"
                    className="flex-1 bg-[hsl(var(--primary))] hover:bg-blue-700 text-white text-lg h-14"
                    disabled={isSold || isPending}
                    onClick={() => {
                      addToCart(product, 1, isShopProduct ? 'shop' : 'marketplace');
                      toast.success(t('product.added_to_cart'));
                    }}
                  >
                    <ShoppingCart className="mr-2" />
                    {isPending ? t('product.pending') : t('product.add_to_cart')}
                  </Button>
                  {!isShopProduct && (
                    <Button
                      size="lg"
                      variant="outline"
                      className={`w-14 h-14 p-0 ${isFav ? 'text-red-500 border-red-200 bg-red-50' : ''}`}
                      onClick={handleFavoriteToggle}
                    >
                      <Heart className={isFav ? 'fill-current' : ''} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProductDetailPage;
