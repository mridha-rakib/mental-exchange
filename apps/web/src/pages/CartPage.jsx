import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Minus, PackageCheck, Plus, ShieldCheck, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useCart } from '@/contexts/CartContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const CartPage = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    getSubtotal,
    getTotal,
    SHIPPING_FEE,
    SERVICE_FEE,
    itemCount,
  } = useCart();
  const { t, language } = useTranslation();

  const formatPrice = (value) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value || 0));

  const trustItems = [
    {
      icon: ShieldCheck,
      title: t('info.secure_title'),
      body: t('info.secure_body'),
    },
    {
      icon: Truck,
      title: t('cart.shipping'),
      body: t('help.shipping_body'),
    },
    {
      icon: BadgeCheck,
      title: t('popular.verified'),
      body: t('shop.subtitle'),
    },
  ];

  if (cartItems.length === 0) {
    return (
      <>
        <Helmet>
          <title>{`${t('cart.title')} - Zahniboerse`}</title>
        </Helmet>

        <main className="bg-[linear-gradient(180deg,#f7f8fc_0%,#eef2fb_100%)] px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-3xl rounded-[32px] bg-white/92 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,0,255,0.08)] text-[#0000FF]">
              <PackageCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-6 font-['Playfair_Display'] text-3xl text-[hsl(var(--foreground))] md:text-4xl">
              {t('cart.empty_title')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[hsl(var(--secondary-text))] md:text-base">
              {t('cart.empty_desc')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                onClick={() => navigate('/marketplace')}
                className="h-12 rounded-full bg-[#0000FF] px-6 text-white hover:bg-[#0000CC]"
              >
                {t('cart.go_marketplace')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/shop')}
                className="h-12 rounded-full border-[hsl(var(--border))] px-6"
              >
                {t('nav.shop')}
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${t('cart.title')} - Zahniboerse`}</title>
      </Helmet>

      <main className="bg-[linear-gradient(180deg,#f8f9fd_0%,#eef2fb_55%,#f8f8fb_100%)] px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-[32px] bg-white/88 px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur md:px-8 md:py-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--secondary-text))] transition hover:text-[#0000FF]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('product.back')}
            </button>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#0000FF]/72">
                  {t('cart.title')}
                </p>
                <h1 className="mt-3 font-['Playfair_Display'] text-4xl leading-tight text-[hsl(var(--foreground))] md:text-5xl">
                  {itemCount} {itemCount === 1 ? t('marketplace.product_singular') : t('marketplace.product_plural')}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[hsl(var(--secondary-text))] md:text-base">
                  {t('checkout.stripe_note')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {trustItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-[rgba(0,0,255,0.08)] bg-[linear-gradient(180deg,rgba(0,0,255,0.04),rgba(255,255,255,0.92))] px-4 py-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0000FF]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</h2>
                      <p className="mt-2 text-xs leading-6 text-[hsl(var(--secondary-text))]">{item.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              {cartItems.map((item) => {
                const imageUrl = item.product?.image ? pb.files.getUrl(item.product, item.product.image) : null;
                const lineTotal = (item.product?.price || 0) * (item.quantity || 1);

                return (
                  <article
                    key={item.id}
                    className="rounded-[28px] border border-white/70 bg-white/94 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur md:p-5"
                  >
                    <div className="flex flex-col gap-5 md:flex-row">
                      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-[24px] bg-[hsl(var(--muted-bg))] md:h-32 md:w-32">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.product?.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm text-[hsl(var(--secondary-text))]">{t('shop.no_image')}</span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="inline-flex rounded-full bg-[rgba(0,0,255,0.06)] px-3 py-1 text-xs font-medium text-[#0000FF]">
                              {item.product_type === 'shop'
                                ? t('common.shop')
                                : t('cart.by_seller', {
                                    seller: item.product?.seller_username || t('common.seller'),
                                  })}
                            </div>
                            <h2 className="mt-3 text-xl font-semibold leading-tight text-[hsl(var(--foreground))]">
                              {item.product?.name}
                            </h2>
                            <p className="mt-2 text-sm text-[hsl(var(--secondary-text))]">
                              {item.product?.description || t('product.no_description')}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id, item.product_id)}
                            className="inline-flex items-center gap-2 self-start rounded-full bg-[rgba(239,68,68,0.08)] px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-[rgba(239,68,68,0.14)]"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('seller.delete')}
                          </button>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-[hsl(var(--border))] pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="inline-flex w-fit items-center rounded-full border border-[hsl(var(--border))] bg-white p-1">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full text-[hsl(var(--secondary-text))] transition hover:bg-[hsl(var(--muted-bg))] disabled:opacity-40"
                              onClick={() => updateQuantity(item.id, item.product_id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-semibold text-[hsl(var(--foreground))]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full text-[hsl(var(--secondary-text))] transition hover:bg-[hsl(var(--muted-bg))]"
                              onClick={() => updateQuantity(item.id, item.product_id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-end justify-between gap-4 sm:block">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--secondary-text))]">
                              {t('common.total')}
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-[#0000FF]">
                              {formatPrice(lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="lg:sticky lg:top-[100px] lg:self-start">
              <div className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0000FF]/72">
                      {t('cart.summary')}
                    </p>
                    <h2 className="mt-2 font-['Playfair_Display'] text-3xl text-[hsl(var(--foreground))]">
                      {t('checkout.order_summary')}
                    </h2>
                  </div>
                  <div className="rounded-full bg-[rgba(0,0,255,0.07)] px-3 py-1 text-sm font-medium text-[#0000FF]">
                    {itemCount}
                  </div>
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

                <div className="mt-6 space-y-3">
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-full bg-[#0000FF] text-white hover:bg-[#0000CC]"
                    onClick={() => navigate('/checkout')}
                  >
                    {t('cart.checkout')}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-full border-[hsl(var(--border))]"
                    onClick={() => navigate('/marketplace')}
                  >
                    {t('cart.continue')}
                  </Button>
                </div>

                <div className="mt-6 space-y-3 rounded-[24px] border border-[rgba(0,0,255,0.08)] bg-[linear-gradient(180deg,rgba(0,0,255,0.03),rgba(255,255,255,0.92))] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-[#0000FF]" />
                    <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{t('checkout.stripe_note')}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-4 w-4 text-[#0000FF]" />
                    <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{t('help.shipping_body')}</p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
};

export default CartPage;
