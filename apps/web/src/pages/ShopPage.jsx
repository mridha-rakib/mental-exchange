import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Mail, PackageCheck, Shapes, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { subscribeToNewsletter } from '@/lib/newsletterApi.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import AdminProductUploadModal from '@/components/AdminProductUploadModal.jsx';

const heroImage =
  'https://horizons-cdn.hostinger.com/ee44c44d-e3d6-46f2-a1fd-aa631a0ae621/c6724b6c2ada2b2a8d9bcef122eb7e06.jpg';

const subjectKeys = {
  Kons: 'marketplace.subject_kons',
  Pro: 'marketplace.subject_pro',
  KFO: 'marketplace.subject_kfo',
  Paro: 'marketplace.subject_paro',
};

const subjectOrder = ['Kons', 'Pro', 'KFO', 'Paro'];

const getProductSubjects = (product) => {
  if (Array.isArray(product.fachbereich)) return product.fachbereich.filter(Boolean);
  if (product.fachbereich) return [product.fachbereich];
  return [];
};

const ShopProductCard = ({ product, t, navigate, formatPrice }) => {
  const subjects = getProductSubjects(product);

  return (
    <article className="group overflow-hidden rounded-[24px] border border-black/5 bg-white transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[1/0.92] overflow-hidden bg-[#f6f1e8]">
        {product.image ? (
          <img
            src={pb.files.getUrl(product, product.image)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
            {t('shop.no_image')}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.18))]" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-none">
            {t('popular.official')}
          </Badge>
          {product.condition && (
            <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
              {product.condition}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex min-h-[214px] flex-col p-5">
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subjects.slice(0, 2).map((subject) => (
              <span
                key={`${product.id}-${subject}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {t(subjectKeys[subject] || 'marketplace.subject_paro')}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4">
          <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-slate-900">
            {product.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {product.description || t('shop.subtitle')}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t('popular.verified')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatPrice(product.price)}</p>
          </div>

          <Button
            size="sm"
            className="h-10 rounded-full bg-[#0000FF] px-5 text-white shadow-none hover:bg-[#0000CC]"
            onClick={() => navigate(`/product/${product.id}?type=shop`)}
          >
            {t('shop.details')}
          </Button>
        </div>
      </div>
    </article>
  );
};

const ShopPage = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { t, language } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pb.collection('shop_products').getFullList({
        sort: '-created',
        $autoCancel: false,
      });
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error(t('shop.load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleNewsletterSignup = async (e) => {
    e.preventDefault();

    const targetEmail = currentUser ? currentUser.email : email;
    if (!targetEmail) return;

    setNewsletterLoading(true);
    try {
      await subscribeToNewsletter({
        email: targetEmail,
        fallbackMessage: t('footer.newsletter_error'),
      });
      toast.success(t('footer.newsletter_success'));
      setEmail('');
    } catch (error) {
      console.error('Newsletter error:', error);
      toast.error(t('footer.newsletter_error'));
    } finally {
      setNewsletterLoading(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(price) || 0);

  const scrollToNewsletter = () => {
    document.getElementById('shop-newsletter')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const experienceHighlights = [
    {
      icon: BadgeCheck,
      title: t('info.secure_title'),
      description: t('info.secure_body'),
    },
    {
      icon: PackageCheck,
      title: t('info.simple_title'),
      description: t('info.simple_body'),
    },
    {
      icon: Sparkles,
      title: t('info.sustainable_title'),
      description: t('info.sustainable_body'),
    },
  ];

  const subjectGroups = subjectOrder
    .map((subjectId) => ({
      id: subjectId,
      label: t(subjectKeys[subjectId]),
      products: products.filter((product) => getProductSubjects(product).includes(subjectId)),
    }))
    .filter((group) => group.products.length > 0);

  const featuredProducts = products.slice(0, 4);
  const newestProducts = products.slice(0, 8);
  const leadProduct = featuredProducts[0] || null;

  return (
    <>
      <Helmet>
        <title>{t('shop.meta_title')}</title>
        <meta name="description" content={t('shop.meta_description')} />
      </Helmet>

      <main className="flex-1 bg-[linear-gradient(180deg,#f7f5ef_0%,#fcfbf8_26%,#ffffff_100%)]">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,255,0.10),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.92))]" />
          <div className="absolute inset-y-0 right-0 hidden w-[44%] lg:block">
            <img src={heroImage} alt="Zahnmedizinische Instrumente im Shop" className="h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#f7f5ef_0%,rgba(247,245,239,0.65)_34%,rgba(247,245,239,0.14)_100%)]" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
              <div className="max-w-3xl">
                <div className="mb-6 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                    {t('popular.official')}
                  </Badge>
                  <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                    {t('popular.verified')}
                  </Badge>
                </div>

                <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
                  {t('shop.title')}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  {t('shop.subtitle')}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => scrollToSection('shop-catalog')}
                    className="h-11 rounded-full bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]"
                  >
                    {products.length > 0 ? t('popular.view_all') : t('shop.newsletter_title')}
                    <ArrowRight className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/marketplace')}
                    className="h-11 rounded-full border-black/10 bg-white/80 px-6 text-slate-700 shadow-none hover:bg-white"
                  >
                    {t('nav.marketplace')}
                  </Button>

                  {isAdmin && (
                    <AdminProductUploadModal onSuccess={loadProducts}>
                      <button className="inline-flex h-11 items-center justify-center rounded-full border border-[#0000FF]/20 bg-[#0000FF]/8 px-6 text-sm font-semibold text-[#0000FF] transition-colors duration-150 hover:bg-[#0000FF]/12">
                        {t('shop.admin_sell')}
                      </button>
                    </AdminProductUploadModal>
                  )}
                </div>

                {subjectGroups.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {subjectGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => scrollToSection(`shop-subject-${group.id}`)}
                        className="rounded-full bg-white/88 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-[#0000FF]"
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/78 p-5 backdrop-blur-sm md:p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-black/5 bg-white/88 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('nav.shop')}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{products.length}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/88 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t('marketplace.subject')}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{subjectGroups.length}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {experienceHighlights.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="rounded-2xl border border-black/5 bg-white/85 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="shop-catalog" className="py-14 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
                    <div className="aspect-[1/0.92] animate-pulse bg-[linear-gradient(135deg,#f3f4f6,#e5e7eb)]" />
                    <div className="space-y-3 p-5">
                      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-5 w-1/2 animate-pulse rounded-full bg-slate-200" />
                      <div className="pt-4">
                        <div className="h-10 animate-pulse rounded-full bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-14">
                {leadProduct && (
                  <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white">
                    <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="relative min-h-[320px] overflow-hidden bg-[#f6f1e8]">
                        {leadProduct.image ? (
                          <img
                            src={pb.files.getUrl(leadProduct, leadProduct.image)}
                            alt={leadProduct.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                            {t('shop.no_image')}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.10),transparent_50%)]" />
                      </div>

                      <div className="p-7 md:p-10 lg:p-12">
                        <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                          {t('popular.title')}
                        </Badge>
                        <h2 className="mt-5 text-3xl font-bold text-slate-900 md:text-4xl">{leadProduct.name}</h2>
                        <p className="mt-4 line-clamp-4 text-base leading-7 text-slate-600">
                          {leadProduct.description || t('shop.subtitle')}
                        </p>

                        {getProductSubjects(leadProduct).length > 0 && (
                          <div className="mt-6 flex flex-wrap gap-2">
                            {getProductSubjects(leadProduct).map((subject) => (
                              <span
                                key={`${leadProduct.id}-${subject}`}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                {t(subjectKeys[subject] || 'marketplace.subject_paro')}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                          <p className="text-3xl font-semibold text-slate-900">{formatPrice(leadProduct.price)}</p>
                          <Button
                            type="button"
                            className="h-11 rounded-full bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]"
                            onClick={() => navigate(`/product/${leadProduct.id}?type=shop`)}
                          >
                            {t('shop.details')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {subjectGroups.length > 0 && (
                  <section>
                    <div className="mb-8 max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">
                        {t('marketplace.subject')}
                      </p>
                      <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                        {t('marketplace.subject')}
                      </h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        {t('popular.subtitle')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                      {subjectGroups.map((group) => {
                        const preview = group.products[0];
                        const label =
                          group.products.length === 1 ? t('marketplace.product_singular') : t('marketplace.product_plural');

                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => scrollToSection(`shop-subject-${group.id}`)}
                            className="group overflow-hidden rounded-[24px] border border-black/5 bg-white text-left transition-transform duration-300 hover:-translate-y-1"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden bg-[#f6f1e8]">
                              {preview?.image ? (
                                <img
                                  src={pb.files.getUrl(preview, preview.image)}
                                  alt={group.label}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                                  {group.label}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.22))]" />
                            </div>

                            <div className="p-5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-xl font-semibold text-slate-900">{group.label}</h3>
                                  <p className="mt-2 text-sm text-slate-500">{`${group.products.length} ${label}`}</p>
                                </div>
                                <div className="rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                                  <Shapes className="size-4" />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">
                        {t('popular.official')} / {t('popular.verified')}
                      </p>
                      <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{t('popular.title')}</h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">{t('popular.subtitle')}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={scrollToNewsletter}
                      className="h-11 rounded-full border-black/10 bg-white px-6 text-slate-700 shadow-none hover:bg-slate-50"
                    >
                      {currentUser ? t('footer.subscribe_current') : t('footer.subscribe')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {featuredProducts.map((product) => (
                      <ShopProductCard
                        key={product.id}
                        product={product}
                        t={t}
                        navigate={navigate}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>
                </section>

                {subjectGroups.map((group) => (
                  <section key={group.id} id={`shop-subject-${group.id}`}>
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">
                          {t('marketplace.subject')}
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{group.label}</h2>
                        <p className="mt-3 text-base leading-7 text-slate-600">
                          {t('shop.subtitle')}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => scrollToSection('shop-catalog')}
                        className="h-11 rounded-full border-black/10 bg-white px-6 text-slate-700 shadow-none hover:bg-slate-50"
                      >
                        {t('popular.view_all')}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                      {group.products.slice(0, 4).map((product) => (
                        <ShopProductCard
                          key={product.id}
                          product={product}
                          t={t}
                          navigate={navigate}
                          formatPrice={formatPrice}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                <section>
                  <div className="mb-8 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">
                      {t('shop.title')}
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{t('popular.view_all')}</h2>
                    <p className="mt-3 text-base leading-7 text-slate-600">{t('shop.subtitle')}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {newestProducts.map((product) => (
                      <ShopProductCard
                        key={`${product.id}-all`}
                        product={product}
                        t={t}
                        navigate={navigate}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white">
                <div className="grid lg:grid-cols-[minmax(0,1.08fr)_0.92fr]">
                  <div className="p-7 md:p-10 lg:p-12">
                    <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                      {t('shop.coming_soon')}
                    </Badge>
                    <h3 className="mt-5 max-w-xl text-3xl font-bold text-slate-900 md:text-4xl">
                      {t('shop.newsletter_title')}
                    </h3>
                    <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                      {t('shop.coming_soon_body')}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={scrollToNewsletter}
                        className="h-11 rounded-full bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]"
                      >
                        <Mail className="size-4" />
                        {t('footer.subscribe')}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/marketplace')}
                        className="h-11 rounded-full border-black/10 bg-white px-6 text-slate-700 shadow-none hover:bg-slate-50"
                      >
                        {t('nav.marketplace')}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-[linear-gradient(180deg,#fbfaf7_0%,#f4efe5_100%)] p-7 md:p-10 lg:p-12">
                    <div className="space-y-4">
                      {experienceHighlights.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div key={item.title} className="rounded-[24px] bg-white/88 p-5">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                                <Icon className="size-4" />
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="shop-newsletter" className="pb-14 md:pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-black/5 bg-[linear-gradient(135deg,#f5f1e7_0%,#faf9f5_55%,#eef2ff_100%)]">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="p-7 md:p-10 lg:p-12">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">
                    {t('footer.newsletter')}
                  </p>
                  <h2 className="mt-3 max-w-xl text-3xl font-bold text-slate-900 md:text-4xl">
                    {t('shop.newsletter_title')}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    {t('shop.newsletter_body')}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {experienceHighlights.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-full bg-white/82 px-4 py-2 text-sm font-medium text-slate-700"
                      >
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-7 md:p-10">
                  <div className="rounded-[28px] bg-white/88 p-6">
                    <form onSubmit={handleNewsletterSignup} className="space-y-4">
                      {!currentUser && (
                        <Input
                          type="email"
                          placeholder={t('shop.email_placeholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12 rounded-full border-black/10 bg-white px-4 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-0"
                        />
                      )}

                      {currentUser && (
                        <div className="rounded-2xl bg-[#0000FF]/6 px-4 py-3 text-sm text-slate-600">
                          {currentUser.email}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={newsletterLoading}
                        className="h-12 w-full rounded-full bg-[#0000FF] text-white shadow-none hover:bg-[#0000CC]"
                      >
                        {newsletterLoading
                          ? t('common.loading')
                          : currentUser
                            ? t('footer.subscribe_current')
                            : t('footer.subscribe')}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default ShopPage;
