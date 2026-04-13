import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Trash2, Minus, Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getSubtotal, getTotal, SHIPPING_FEE, SERVICE_FEE } = useCart();
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // If accessed directly on mobile, we still render the page but styled responsively.
  // The Header handles the modal popup for normal navigation.

  if (cartItems.length === 0) {
    return (
      <>
        <Helmet>
          <title>{t('cart.title')} - Zahnibörse</title>
        </Helmet>

        <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 font-['Playfair_Display']">{t('cart.empty_title')}</h1>
            <p className="text-[hsl(var(--secondary-text))] mb-8">{t('cart.empty_desc')}</p>
            <Button onClick={() => navigate('/marketplace')} className="bg-[#0000FF] hover:bg-[#0000CC] text-white min-h-[44px]">
              {t('cart.go_marketplace')}
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('cart.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 font-['Playfair_Display']">{t('cart.title')}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="border border-[hsl(var(--border))] shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-[hsl(var(--muted-bg))] rounded-lg overflow-hidden flex-shrink-0">
                        {item.product?.image && (
                          <img
                            src={pb.files.getUrl(item.product, item.product.image)}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold mb-1 line-clamp-2 text-sm md:text-base">{item.product?.name}</h3>
                          <p className="text-xs md:text-sm text-[hsl(var(--secondary-text))] mb-2">
                            {item.product_type === 'shop' ? t('common.shop') : t('cart.by_seller', { seller: item.product?.seller_username || t('common.seller') })}
                          </p>
                        </div>
                        <p className="text-base md:text-lg font-bold text-[#0000FF]">€{item.product?.price.toFixed(2)}</p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1 bg-white rounded-md border border-[hsl(var(--border))]">
                          <button
                            className="p-1.5 text-[hsl(var(--secondary-text))] disabled:opacity-50"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3 md:h-4 md:w-4" />
                          </button>
                          <span className="text-xs md:text-sm font-medium w-6 md:w-8 text-center">{item.quantity}</span>
                          <button
                            className="p-1.5 text-[hsl(var(--secondary-text))]"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Card className="border border-[hsl(var(--border))] shadow-sm sticky top-[100px]">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-semibold font-['Playfair_Display']">{t('cart.summary')}</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--secondary-text))]">{t('cart.subtotal')}</span>
                      <span>€{getSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--secondary-text))]">{t('cart.shipping')}</span>
                      <span>€{SHIPPING_FEE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[hsl(var(--secondary-text))]">{t('cart.service_fee')}</span>
                      <span>€{SERVICE_FEE.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[hsl(var(--border))] pt-3 flex justify-between font-semibold text-base md:text-lg">
                      <span>{t('common.total')}</span>
                      <span className="text-[#0000FF]">€{getTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button className="w-full bg-[#0000FF] hover:bg-[#0000CC] text-white min-h-[44px]" size="lg" onClick={() => navigate('/checkout')}>
                    {t('cart.checkout')}
                  </Button>

                  <Button variant="outline" className="w-full min-h-[44px]" onClick={() => navigate('/marketplace')}>
                    {t('cart.continue')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CartPage;
