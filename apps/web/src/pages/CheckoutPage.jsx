import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, LockKeyhole, ShieldCheck, Truck } from 'lucide-react';
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
  const { cartItems, getSubtotal, getTotal, SHIPPING_FEE, SERVICE_FEE, itemCount } = useCart();
  const { t, language } = useTranslation();

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
    country: t('checkout.country_default'),
  });

  const formatPrice = (value) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value || 0));

  const handleInputChange = (event) => {
    setShippingAddress((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCheckout = async (event) => {
    event.preventDefault();

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
        setLoading(false);
        toast.error(t('checkout.auth_required'));
        navigate('/auth');
        return;
      }

      const response = await apiServerClient.fetch('/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          buyer_id: currentUser?.id,
          buyer_name: currentUser?.name || shippingAddress.name,
          buyer_email: currentUser?.email || shippingAddress.email,
          shipping_address: shippingAddress,
          cart_items: cartItems,
        }),
      });

      if (response.status === 401) {
        setLoading(false);
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
        return;
      }

      throw new Error(t('checkout.no_url'));
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.message || t('checkout.payment_error'));
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <>
        <Helmet>
          <title>{`${t('checkout.title')} - Zahniboerse`}</title>
        </Helmet>

        <main className="bg-[linear-gradient(180deg,#f7f8fc_0%,#eef2fb_100%)] px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-3xl rounded-[32px] bg-white/94 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,0,255,0.08)] text-[#0000FF]">
              <CreditCard className="h-8 w-8" />
            </div>
            <h1 className="mt-6 font-['Playfair_Display'] text-3xl text-[hsl(var(--foreground))] md:text-4xl">
              {t('cart.empty_title')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[hsl(var(--secondary-text))] md:text-base">
              {t('checkout.empty_toast')}
            </p>
            <Button
              onClick={() => navigate('/marketplace')}
              className="mt-8 h-12 rounded-full bg-[#0000FF] px-6 text-white hover:bg-[#0000CC]"
            >
              {t('checkout.back_marketplace')}
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${t('checkout.title')} - Zahniboerse`}</title>
      </Helmet>

      <main className="bg-[linear-gradient(180deg,#f8f9fd_0%,#eef2fb_58%,#f8f8fb_100%)] px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-[32px] bg-white/88 px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur md:px-8 md:py-8">
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--secondary-text))] transition hover:text-[#0000FF]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('cart.title')}
            </button>

            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#0000FF]/72">
                  {t('checkout.title')}
                </p>
                <h1 className="mt-3 font-['Playfair_Display'] text-4xl leading-tight text-[hsl(var(--foreground))] md:text-5xl">
                  {t('checkout.submit')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--secondary-text))] md:text-base">
                  {t('checkout.stripe_note')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-[rgba(0,0,255,0.08)] bg-[linear-gradient(180deg,rgba(0,0,255,0.04),rgba(255,255,255,0.92))] px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0000FF]">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">{t('info.secure_title')}</h2>
                  <p className="mt-2 text-xs leading-6 text-[hsl(var(--secondary-text))]">{t('checkout.stripe_note')}</p>
                </div>

                <div className="rounded-[24px] border border-[rgba(0,0,255,0.08)] bg-[linear-gradient(180deg,rgba(0,0,255,0.04),rgba(255,255,255,0.92))] px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0000FF]">
                    <Truck className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">{t('cart.shipping')}</h2>
                  <p className="mt-2 text-xs leading-6 text-[hsl(var(--secondary-text))]">{t('help.shipping_body')}</p>
                </div>

                <div className="rounded-[24px] border border-[rgba(0,0,255,0.08)] bg-[linear-gradient(180deg,rgba(0,0,255,0.04),rgba(255,255,255,0.92))] px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0000FF]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">{t('popular.verified')}</h2>
                  <p className="mt-2 text-xs leading-6 text-[hsl(var(--secondary-text))]">{t('shop.subtitle')}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <form
                id="checkout-form"
                onSubmit={handleCheckout}
                className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0000FF]/72">
                    {t('checkout.shipping_address')}
                  </p>
                  <h2 className="font-['Playfair_Display'] text-3xl text-[hsl(var(--foreground))]">
                    {t('checkout.full_name')}
                  </h2>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">{t('checkout.full_name')} *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={shippingAddress.name}
                      onChange={handleInputChange}
                      required
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
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
                      className="h-12 rounded-2xl border-[hsl(var(--border))] bg-white px-4"
                    />
                  </div>
                </div>
              </form>

              <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0000FF]/72">
                  {t('checkout.accept_terms')}
                </p>
                <h2 className="mt-2 font-['Playfair_Display'] text-3xl text-[hsl(var(--foreground))]">
                  {t('checkout.order_summary')}
                </h2>

                <div className="mt-6 space-y-4">
                  <label className="flex items-start gap-3 rounded-[22px] bg-[hsl(var(--muted-bg))] px-4 py-4">
                    <Checkbox id="agb" checked={agbAccepted} onCheckedChange={setAgbAccepted} className="mt-1" />
                    <span className="text-sm leading-6 text-[hsl(var(--secondary-text))]">
                      {t('checkout.accept_terms')}{' '}
                      <a href="/agb" target="_blank" rel="noreferrer" className="font-medium text-[#0000FF] hover:underline">
                        {t('checkout.terms')}
                      </a>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-[22px] bg-[hsl(var(--muted-bg))] px-4 py-4">
                    <Checkbox
                      id="datenschutz"
                      checked={datenschutzAccepted}
                      onCheckedChange={setDatenschutzAccepted}
                      className="mt-1"
                    />
                    <span className="text-sm leading-6 text-[hsl(var(--secondary-text))]">
                      {t('checkout.accept_privacy')}{' '}
                      <a
                        href="/datenschutz"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#0000FF] hover:underline"
                      >
                        {t('checkout.privacy')}
                      </a>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-[22px] bg-[hsl(var(--muted-bg))] px-4 py-4">
                    <Checkbox
                      id="newsletter"
                      checked={newsletterAccepted}
                      onCheckedChange={setNewsletterAccepted}
                      className="mt-1"
                    />
                    <span className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{t('checkout.newsletter')}</span>
                  </label>
                </div>
              </section>
            </section>

            <aside className="lg:sticky lg:top-[100px] lg:self-start">
              <div className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0000FF]/72">
                      {t('checkout.order_summary')}
                    </p>
                    <h2 className="mt-2 font-['Playfair_Display'] text-3xl text-[hsl(var(--foreground))]">
                      {itemCount} {itemCount === 1 ? t('marketplace.product_singular') : t('marketplace.product_plural')}
                    </h2>
                  </div>
                  <div className="rounded-full bg-[rgba(0,0,255,0.07)] px-3 py-1 text-sm font-medium text-[#0000FF]">
                    {itemCount}
                  </div>
                </div>

                <div className="mt-6 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[22px] border border-[hsl(var(--border))] bg-white px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.product?.name}</p>
                          <p className="mt-1 text-xs leading-6 text-[hsl(var(--secondary-text))]">
                            {t('common.quantity')}: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[#0000FF]">
                          {formatPrice((item.product?.price || 0) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 rounded-[24px] bg-[hsl(var(--muted-bg))] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[hsl(var(--secondary-text))]">{t('cart.subtotal')}</span>
                    <span className="font-medium">{formatPrice(getSubtotal())}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[hsl(var(--secondary-text))]">{t('cart.shipping')}</span>
                    <span className="font-medium">{formatPrice(SHIPPING_FEE)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[hsl(var(--secondary-text))]">{t('cart.service_fee')}</span>
                    <span className="font-medium">{formatPrice(SERVICE_FEE)}</span>
                  </div>
                  <div className="border-t border-white pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">{t('common.total')}</span>
                      <span className="text-2xl font-semibold text-[#0000FF]">{formatPrice(getTotal())}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  form="checkout-form"
                  className="mt-6 h-12 w-full rounded-full bg-[#0000FF] text-white hover:bg-[#0000CC]"
                  disabled={loading || !agbAccepted || !datenschutzAccepted}
                >
                  {loading ? t('checkout.processing') : t('checkout.submit')}
                </Button>

                <div className="mt-6 space-y-3 rounded-[24px] border border-[rgba(0,0,255,0.08)] bg-[linear-gradient(180deg,rgba(0,0,255,0.03),rgba(255,255,255,0.92))] p-4">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-4 w-4 text-[#0000FF]" />
                    <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{t('checkout.stripe_note')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-4 w-4 text-[#0000FF]" />
                    <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{t('help.shipping_body')}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
};

export default CheckoutPage;
