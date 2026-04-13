import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import pb from '@/lib/pocketbaseClient.js';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { cartItems, getSubtotal, getTotal, SHIPPING_FEE, SERVICE_FEE } = useCart();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false);
  const [newsletterAccepted, setNewsletterAccepted] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    street: '',
    city: '',
    postal_code: '',
    country: t('checkout.country_default')
  });

  const handleInputChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast.error(t('checkout.empty_toast'));
      return;
    }

    if (!agbAccepted || !datenschutzAccepted) {
      toast.error(t('checkout.accept_toast'));
      return;
    }

    if (!shippingAddress.name || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postal_code) {
      toast.error(t('checkout.required_toast'));
      return;
    }

    setLoading(true);
    try {
      const authToken = pb.authStore.token;
      
      if (!authToken) {
        toast.error(t('checkout.auth_required'));
        navigate('/auth');
        return;
      }

      const response = await apiServerClient.fetch('/checkout/create-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          buyer_id: currentUser?.id,
          buyer_name: currentUser?.name || shippingAddress.name,
          buyer_email: currentUser?.email || shippingAddress.email,
          shipping_address: shippingAddress,
          cart_items: cartItems
        })
      });

      if (response.status === 401) {
        toast.error(t('checkout.auth_required'));
        navigate('/auth');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('checkout.session_error'));
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(t('checkout.no_url'));
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.message || t('checkout.payment_error'));
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold mb-4">{t('cart.empty_title')}</h2>
        <Button onClick={() => navigate('/marketplace')}>{t('checkout.back_marketplace')}</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('checkout.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted))] py-12 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12">{t('checkout.title')}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[8px] p-6 md:p-8 shadow-card">
                <h2 className="text-xl font-semibold mb-6">{t('checkout.shipping_address')}</h2>
                
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">{t('checkout.full_name')} *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={shippingAddress.name}
                        onChange={handleInputChange}
                        required
                        className="focus-ring-primary"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email">{t('checkout.email')} *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={shippingAddress.email}
                        onChange={handleInputChange}
                        required
                        className="focus-ring-primary"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">{t('checkout.street')} *</Label>
                      <Input
                        id="street"
                        name="street"
                        value={shippingAddress.street}
                        onChange={handleInputChange}
                        required
                        className="focus-ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postal_code">{t('checkout.postal_code')} *</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        value={shippingAddress.postal_code}
                        onChange={handleInputChange}
                        required
                        className="focus-ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">{t('checkout.city')} *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={shippingAddress.city}
                        onChange={handleInputChange}
                        required
                        className="focus-ring-primary"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="country">{t('checkout.country')} *</Label>
                      <Input
                        id="country"
                        name="country"
                        value={shippingAddress.country}
                        onChange={handleInputChange}
                        required
                        className="focus-ring-primary"
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white rounded-[8px] p-6 md:p-8 shadow-card sticky top-[100px]">
                <h2 className="text-xl font-semibold mb-6">{t('checkout.order_summary')}</h2>

                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1 pr-4">
                        <span className="font-medium text-[hsl(var(--foreground))] line-clamp-2">
                          {item.product?.name}
                        </span>
                        <span className="text-[hsl(var(--secondary))]">{t('common.quantity')}: {item.quantity}</span>
                      </div>
                      <span className="font-medium">
                        €{((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[hsl(var(--border))] pt-4 space-y-3 text-sm mb-6">
                  <div className="flex justify-between text-[hsl(var(--secondary))]">
                    <span>{t('cart.subtotal')}</span>
                    <span>€{getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[hsl(var(--secondary))]">
                    <span>{t('cart.shipping')}</span>
                    <span>€{SHIPPING_FEE.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[hsl(var(--secondary))]">
                    <span>{t('cart.service_fee')}</span>
                    <span>€{SERVICE_FEE.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[hsl(var(--border))] pt-3 flex justify-between font-bold text-lg">
                    <span>{t('common.total')}</span>
                    <span className="text-[hsl(var(--primary))]">€{getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="agb" 
                      checked={agbAccepted} 
                      onCheckedChange={setAgbAccepted} 
                    />
                    <Label htmlFor="agb" className="text-sm font-normal leading-snug cursor-pointer">
                      {t('checkout.accept_terms')} <a href="/agb" target="_blank" className="text-[#0000FF] hover:underline">{t('checkout.terms')}</a>.
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="datenschutz" 
                      checked={datenschutzAccepted} 
                      onCheckedChange={setDatenschutzAccepted} 
                    />
                    <Label htmlFor="datenschutz" className="text-sm font-normal leading-snug cursor-pointer">
                      {t('checkout.accept_privacy')} <a href="/datenschutz" target="_blank" className="text-[#0000FF] hover:underline">{t('checkout.privacy')}</a>.
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="newsletter" 
                      checked={newsletterAccepted} 
                      onCheckedChange={setNewsletterAccepted} 
                    />
                    <Label htmlFor="newsletter" className="text-sm font-normal leading-snug cursor-pointer">
                      {t('checkout.newsletter')}
                    </Label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  form="checkout-form"
                  className="w-full h-[48px] text-[16px] text-white bg-[#0000FF] hover:bg-[#0000CC] transition-smooth shadow-button disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={loading || !agbAccepted || !datenschutzAccepted}
                >
                  {loading ? t('checkout.processing') : t('checkout.submit')}
                </Button>

                <p className="text-xs text-center text-[hsl(var(--secondary))] mt-4">
                  {t('checkout.stripe_note')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
};

export default CheckoutPage;
