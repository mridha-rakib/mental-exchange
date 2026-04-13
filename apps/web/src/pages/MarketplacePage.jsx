import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, SlidersHorizontal } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import MarketplaceProductCard from '@/components/MarketplaceProductCard.jsx';
import FilterSection from '@/components/FilterSection.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const MarketplacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isSeller } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    seller: '',
    conditions: [],
    fachbereiche: []
  });
  
  const currentSort = searchParams.get('sort') || '-created';
  
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let filterStr = 'status="active"';
      if (filters.seller) {
        filterStr += ` && seller_username ~ "${filters.seller}"`;
      }
      if (filters.conditions && filters.conditions.length > 0) {
        const conds = filters.conditions.map(c => `condition="${c}"`).join(' || ');
        filterStr += ` && (${conds})`;
      }
      if (filters.fachbereiche && filters.fachbereiche.length > 0) {
        const fbs = filters.fachbereiche.map(f => `fachbereich~"${f}"`).join(' || ');
        filterStr += ` && (${fbs})`;
      }
      const result = await pb.collection('products').getList(1, 50, {
        filter: filterStr,
        sort: currentSort,
        $autoCancel: false
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

    pb.collection('products').subscribe('*', function (e) {
      if (e.action === 'update' && e.record.status === 'sold') {
        setProducts(prev => prev.filter(p => p.id !== e.record.id));
      } else if (e.action === 'create' && e.record.status === 'active') {
        fetchProducts();
      } else if (e.action === 'update' && e.record.status === 'active') {
        fetchProducts();
      } else if (e.action === 'delete') {
        setProducts(prev => prev.filter(p => p.id !== e.record.id));
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
      pb.collection('products').unsubscribe('*');
    };
  }, [fetchProducts]);

  const handleSortChange = val => {
    searchParams.set('sort', val);
    setSearchParams(searchParams);
  };

  const handleFiltersChange = useCallback(newFilters => {
    setFilters(newFilters);
  }, []);

  const handleSellClick = e => {
    e.preventDefault();
    if (!isAuthenticated || !isSeller) {
      navigate('/seller-info');
    } else {
      navigate('/seller/new-product');
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('marketplace.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] pb-20">
        <div className="relative py-16 px-4 min-h-[300px] flex items-center">
          <div className="absolute inset-0 overflow-hidden bg-gray-100">
            <img src="https://horizons-cdn.hostinger.com/ee44c44d-e3d6-46f2-a1fd-aa631a0ae621/e168444fa4c2e4395f832548af45023f.jpg" alt="Zahnmedizinische Instrumente" className="w-full h-full object-cover opacity-30 mix-blend-overlay" />
          </div>
          
          <div className="relative max-w-7xl mx-auto w-full">
            <div className="bg-white/90 backdrop-blur-md border border-white/40 rounded-[8px] p-[40px] flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#333333] font-['Playfair_Display'] tracking-tight">
                  {t('marketplace.title')}
                </h1>
                <p className="text-[#666666] text-lg max-w-xl">
                  {t('marketplace.subtitle')}
                </p>
              </div>
              <div className="shrink-0">
                <button onClick={handleSellClick} className="bg-[#0000FF] text-[#ffffff] font-medium text-[16px] rounded-[8px] px-[24px] py-[14px] hover:bg-[#0000CC] transition-all duration-150 shadow-button whitespace-nowrap">
                  {t('marketplace.sell_now')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
          <aside className="hidden md:block w-64 flex-shrink-0">
            <FilterSection onFiltersChange={handleFiltersChange} />
          </aside>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 bg-white p-4 rounded-[var(--radius-md)] shadow-sm border border-[hsl(var(--border))] gap-4">
              <div className="text-sm font-medium text-[hsl(var(--secondary-text))]">
                {t('marketplace.product_count', { count: products.length, label: products.length === 1 ? t('marketplace.product_singular') : t('marketplace.product_plural') })}
              </div>
              
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="md:hidden flex items-center gap-2">
                      <SlidersHorizontal size={16} /> {t('marketplace.filter')}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                    <SheetHeader className="p-6 border-b">
                      <SheetTitle>{t('marketplace.adjust_filters')}</SheetTitle>
                    </SheetHeader>
                    <div className="p-6">
                      <FilterSection onFiltersChange={handleFiltersChange} />
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={currentSort} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder={t('marketplace.sort_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created">{t('marketplace.sort_newest')}</SelectItem>
                    <SelectItem value="created">{t('marketplace.sort_oldest')}</SelectItem>
                    <SelectItem value="price">{t('marketplace.sort_price_asc')}</SelectItem>
                    <SelectItem value="-price">{t('marketplace.sort_price_desc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-[var(--radius-md)] border border-[hsl(var(--border))] overflow-hidden h-[240px] animate-pulse">
                    <div className="h-[140px] bg-gray-200"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {products.map(product => <MarketplaceProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[var(--radius-md)] border border-[hsl(var(--border))] shadow-sm">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="text-muted-foreground" size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('marketplace.empty_title')}</h3>
                <p className="text-[hsl(var(--secondary-text))] mb-6 max-w-md mx-auto">
                  {t('marketplace.empty_body')}
                </p>
                <Button onClick={() => setFilters({ seller: '', conditions: [], fachbereiche: [] })} variant="outline">
                  {t('marketplace.reset_filters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default MarketplacePage;
