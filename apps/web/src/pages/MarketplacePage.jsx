import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, PackagePlus, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import MarketplaceProductCard from '@/components/MarketplaceProductCard.jsx';
import FilterSection from '@/components/FilterSection.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const heroImage =
  'https://horizons-cdn.hostinger.com/ee44c44d-e3d6-46f2-a1fd-aa631a0ae621/e168444fa4c2e4395f832548af45023f.jpg';

const DEFAULT_FILTERS = {
  productTypes: [],
  conditions: [],
  fachbereiche: [],
};

const PRODUCT_TYPE_LABELS = {
  Article: 'marketplace.type_article',
  Set: 'marketplace.type_set',
  Consumable: 'marketplace.type_consumable',
};

const CONDITION_LABELS = {
  Neu: 'marketplace.condition_new',
  'Wie neu': 'marketplace.condition_like_new',
  Gut: 'marketplace.condition_good',
  Befriedigend: 'marketplace.condition_satisfactory',
};

const SUBJECT_LABELS = {
  Kons: 'marketplace.subject_kons',
  Pro: 'marketplace.subject_pro',
  KFO: 'marketplace.subject_kfo',
  Paro: 'marketplace.subject_paro',
};

const MarketplacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isSeller } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const currentSort = searchParams.get('sort') || '-created';

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    try {
      let filterStr = 'status="active"';

      if (filters.productTypes.length > 0) {
        const types = filters.productTypes.map((type) => `product_type="${type}"`).join(' || ');
        filterStr += ` && (${types})`;
      }

      if (filters.conditions.length > 0) {
        const conditions = filters.conditions.map((condition) => `condition="${condition}"`).join(' || ');
        filterStr += ` && (${conditions})`;
      }

      if (filters.fachbereiche.length > 0) {
        const fachbereiche = filters.fachbereiche.map((fachbereich) => `fachbereich~"${fachbereich}"`).join(' || ');
        filterStr += ` && (${fachbereiche})`;
      }

      const result = await pb.collection('products').getList(1, 50, {
        filter: filterStr,
        sort: currentSort,
        $autoCancel: false,
      });

      setProducts(result.items);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSort, filters]);

  useEffect(() => {
    fetchProducts();

    const handleFocus = () => fetchProducts();
    window.addEventListener('focus', handleFocus);

    const intervalId = setInterval(() => {
      fetchProducts();
    }, 5000);

    pb.collection('products').subscribe('*', (event) => {
      if (event.action === 'update' && event.record.status === 'sold') {
        setProducts((prev) => prev.filter((product) => product.id !== event.record.id));
      } else if (event.action === 'create' && event.record.status === 'active') {
        fetchProducts();
      } else if (event.action === 'update' && event.record.status === 'active') {
        fetchProducts();
      } else if (event.action === 'delete') {
        setProducts((prev) => prev.filter((product) => product.id !== event.record.id));
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
      pb.collection('products').unsubscribe('*');
    };
  }, [fetchProducts]);

  const handleSortChange = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sort', value);
    setSearchParams(nextParams);
  };

  const handleSellClick = (e) => {
    e.preventDefault();

    if (!isAuthenticated || !isSeller) {
      navigate('/seller-info');
    } else {
      navigate('/seller/new-product');
    }
  };

  const scrollToCatalog = () => {
    document.getElementById('marketplace-catalog')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const activeFilterCount = filters.productTypes.length + filters.conditions.length + filters.fachbereiche.length;
  const hasActiveFilters = activeFilterCount > 0;

  const activeFilterPills = [
    ...filters.productTypes.map((value) => t(PRODUCT_TYPE_LABELS[value])),
    ...filters.conditions.map((value) => t(CONDITION_LABELS[value])),
    ...filters.fachbereiche.map((value) => t(SUBJECT_LABELS[value])),
  ];

  const resultLabel = t('marketplace.product_count', {
    count: products.length,
    label: products.length === 1 ? t('marketplace.product_singular') : t('marketplace.product_plural'),
  });

  return (
    <>
      <Helmet>
        <title>{t('marketplace.title')} - Zahniboerse</title>
      </Helmet>

      <main className="flex-1 bg-[linear-gradient(180deg,#f7f5ef_0%,#faf9f5_24%,#ffffff_100%)] pb-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,255,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.92))]" />
          <div className="absolute inset-y-0 right-0 hidden w-[44%] lg:block">
            <img src={heroImage} alt="Zahnmedizinische Instrumente" className="h-full w-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#f7f5ef_0%,rgba(247,245,239,0.72)_36%,rgba(247,245,239,0.14)_100%)]" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
              <div className="max-w-3xl">
                <div className="mb-6 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                    {t('marketplace.title')}
                  </Badge>
                  <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                    {resultLabel}
                  </Badge>
                </div>

                <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
                  {t('marketplace.title')}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  {t('marketplace.subtitle')}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={handleSellClick}
                    className="h-11 rounded-full bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]"
                  >
                    {t('marketplace.sell_now')}
                    <ArrowRight className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={scrollToCatalog}
                    className="h-11 rounded-full border-black/10 bg-white/80 px-6 text-slate-700 shadow-none hover:bg-white"
                  >
                    {t('marketplace.adjust_filters')}
                  </Button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/78 p-5 backdrop-blur-sm md:p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <PackagePlus className="size-4 text-[#0000FF]" />
                  <span>{t('seller.benefits_title')}</span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-black/5 bg-white/88 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('seller.benefit_reach_title')}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{t('seller.benefit_reach_body')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white/88 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                        <BadgeCheck className="size-4" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('seller.benefit_free_title')}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{t('seller.benefit_free_body')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white/88 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t('seller.benefit_payment_title')}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{t('seller.benefit_payment_body')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="marketplace-catalog" className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)]">
              <aside className="hidden lg:block">
                <div className="sticky top-[104px]">
                  <FilterSection filters={filters} onFiltersChange={setFilters} />
                </div>
              </aside>

              <div className="min-w-0">
                <div className="rounded-[28px] border border-black/5 bg-white p-5 md:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]/70">
                        {t('marketplace.filter')}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">{resultLabel}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {hasActiveFilters ? t('marketplace.adjust_filters') : t('marketplace.subtitle')}
                      </p>

                      {hasActiveFilters && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {activeFilterPills.map((label) => (
                            <span
                              key={label}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-11 rounded-full border-black/10 bg-white px-5 shadow-none hover:bg-slate-50 lg:hidden"
                          >
                            <SlidersHorizontal className="size-4" />
                            {t('marketplace.filter')}
                            {activeFilterCount > 0 && (
                              <span className="rounded-full bg-[#0000FF]/10 px-2 py-0.5 text-xs font-semibold text-[#0000FF]">
                                {activeFilterCount}
                              </span>
                            )}
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[320px] border-r border-black/5 p-0 sm:w-[400px]">
                          <SheetHeader className="border-b border-black/5 px-6 py-5">
                            <SheetTitle>{t('marketplace.adjust_filters')}</SheetTitle>
                          </SheetHeader>
                          <div className="p-6">
                            <FilterSection filters={filters} onFiltersChange={setFilters} />
                          </div>
                        </SheetContent>
                      </Sheet>

                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setFilters(DEFAULT_FILTERS)}
                          className="h-11 rounded-full px-4 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          {t('marketplace.reset_filters')}
                        </Button>
                      )}

                      <Select value={currentSort} onValueChange={handleSortChange}>
                        <SelectTrigger className="h-11 w-full rounded-full border-black/10 bg-white px-4 shadow-none sm:w-[210px]">
                          <SelectValue placeholder={t('marketplace.sort_placeholder')} />
                        </SelectTrigger>
                        <SelectContent className="border-black/5 bg-white">
                          <SelectItem value="-created">{t('marketplace.sort_newest')}</SelectItem>
                          <SelectItem value="created">{t('marketplace.sort_oldest')}</SelectItem>
                          <SelectItem value="price">{t('marketplace.sort_price_asc')}</SelectItem>
                          <SelectItem value="-price">{t('marketplace.sort_price_desc')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3">
                      {[...Array(8)].map((_, index) => (
                        <div key={index} className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
                          <div className="aspect-[4/3] animate-pulse bg-[linear-gradient(135deg,#f3f4f6,#e5e7eb)]" />
                          <div className="space-y-3 p-5">
                            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
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
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3">
                      {products.map((product) => (
                        <MarketplaceProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white">
                      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="p-7 md:p-10 lg:p-12">
                          <Badge className="rounded-full bg-[#0000FF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0000FF] shadow-none">
                            {t('marketplace.empty_title')}
                          </Badge>
                          <h3 className="mt-5 max-w-xl text-3xl font-bold text-slate-900 md:text-4xl">
                            {t('marketplace.empty_title')}
                          </h3>
                          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                            {t('marketplace.empty_body')}
                          </p>

                          <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                              type="button"
                              onClick={() => setFilters(DEFAULT_FILTERS)}
                              className="h-11 rounded-full bg-[#0000FF] px-6 text-white shadow-none hover:bg-[#0000CC]"
                            >
                              {t('marketplace.reset_filters')}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleSellClick}
                              className="h-11 rounded-full border-black/10 bg-white px-6 text-slate-700 shadow-none hover:bg-slate-50"
                            >
                              {t('marketplace.sell_now')}
                            </Button>
                          </div>
                        </div>

                        <div className="bg-[linear-gradient(180deg,#fbfaf7_0%,#f4efe5_100%)] p-7 md:p-10 lg:p-12">
                          <FilterSection filters={filters} onFiltersChange={setFilters} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default MarketplacePage;
