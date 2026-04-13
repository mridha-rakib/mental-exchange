import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import AdminProductUploadModal from '@/components/AdminProductUploadModal.jsx';

const ShopPage = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await pb.collection('shop_products').getFullList({
        sort: '-created',
        $autoCancel: false
      });
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error(t('shop.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletterSignup = async (e) => {
    e.preventDefault();
    
    const targetEmail = currentUser ? currentUser.email : email;
    if (!targetEmail) return;

    setNewsletterLoading(true);
    try {
      await pb.collection('newsletter_signups').create({ email: targetEmail }, { $autoCancel: false });
      toast.success(t('footer.newsletter_success'));
      setEmail('');
    } catch (error) {
      console.error('Newsletter error:', error);
      toast.error(t('footer.newsletter_error'));
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('shop.meta_title')}</title>
        <meta name="description" content={t('shop.meta_description')} />
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))]">
        <section className="relative min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="https://horizons-cdn.hostinger.com/ee44c44d-e3d6-46f2-a1fd-aa631a0ae621/c6724b6c2ada2b2a8d9bcef122eb7e06.jpg"
              alt="Zahnmedizinische Instrumente im Shop"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]"></div>
          </div>
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight font-['Playfair_Display'] text-gray-900" style={{letterSpacing: '-0.02em'}}>
              {t('shop.title')}
            </h1>
            <p className="text-lg md:text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed mb-8 font-medium">
              {t('shop.subtitle')}
            </p>
            
            {isAdmin && (
              <AdminProductUploadModal onSuccess={loadProducts}>
                <button className="bg-[#0000FF] text-[#ffffff] font-medium text-[14px] rounded-[8px] px-[16px] py-[10px] hover:bg-[#0000CC] transition-all duration-150 shadow-button inline-flex items-center justify-center">
                  {t('shop.admin_sell')}
                </button>
              </AdminProductUploadModal>
            )}
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-none shadow-sm">
                    <div className="aspect-square bg-gray-200 animate-pulse"></div>
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2"></div>
                      <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-hover transition-all duration-300 border border-[hsl(var(--border))]">
                    <div className="aspect-square bg-[hsl(var(--muted-bg))] relative overflow-hidden group">
                      {product.image ? (
                        <img
                          src={pb.files.getUrl(product, product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">{t('shop.no_image')}</div>
                      )}
                      {product.condition && (
                        <Badge className="absolute top-2 right-2 bg-white/90 text-black hover:bg-white">
                          {product.condition}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 flex flex-col h-[160px]">
                      <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                      {product.fachbereich && product.fachbereich.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.fachbereich.map((fach, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-[#0000FF] border-blue-200 bg-blue-50">
                              {fach}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <p className="text-xl font-bold text-[#0000FF]">€{product.price.toFixed(2)}</p>
                        <Button
                          size="sm"
                          className="bg-[#0000FF] hover:bg-[#0000CC] text-white"
                          onClick={() => navigate(`/product/${product.id}?type=shop`)}
                        >
                          {t('shop.details')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[var(--radius-lg)] border border-[hsl(var(--border))]">
                <div className="max-w-md mx-auto">
                  <h3 className="text-2xl font-semibold mb-4 font-['Playfair_Display']">{t('shop.coming_soon')}</h3>
                  <p className="text-[hsl(var(--secondary-text))] mb-6">
                    {t('shop.coming_soon_body')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="relative py-24 overflow-hidden bg-white">
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-['Playfair_Display'] text-gray-900">{t('shop.newsletter_title')}</h2>
            <p className="text-lg mb-10 text-gray-600 max-w-2xl mx-auto">
              {t('shop.newsletter_body')}
            </p>
            
            <div className="max-w-md mx-auto bg-blue-900/10 backdrop-blur-md border border-white/60 p-6 rounded-[8px] shadow-xl">
              <form onSubmit={handleNewsletterSignup} className="flex flex-col gap-4">
                {!currentUser && (
                  <Input
                    type="email"
                    placeholder={t('shop.email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/90 text-black border-none h-12 focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent placeholder:text-gray-500"
                  />
                )}
                <Button type="submit" disabled={newsletterLoading} className="h-12 bg-[#0000FF] text-white hover:bg-[#0000CC] font-semibold w-full transition-colors">
                  {newsletterLoading ? t('common.loading') : (currentUser ? t('footer.subscribe_current') : t('footer.subscribe'))}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default ShopPage;
