import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, PackageSearch } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { toast } from 'sonner';
const PopularProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { t } = useTranslation();
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiServerClient.fetch('/shop/products?perPage=4&sort=-created');

        if (!response.ok) {
          throw new Error('Failed to fetch official shop products');
        }

        const result = await response.json();
        setProducts(Array.isArray(result.items) ? result.items : []);
      } catch (error) {
        console.error('Error fetching popular products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);
  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product, 1, 'shop');
    toast.success(t('product.added_to_cart'));
  };
  return <section className="bg-white py-16 md:py-24 lg:py-32 px-4 md:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12">
          <div>
            <h2 className="font-['Playfair_Display'] font-bold text-[30px] md:text-[36px] lg:text-[48px] text-[hsl(var(--foreground))] mb-2 md:mb-4">
              {t('popular.title')}
            </h2>
            <p className="text-[16px] md:text-[18px] text-[hsl(var(--secondary))]">
              {t('popular.subtitle')}
            </p>
          </div>
          <Link to="/shop" className="hidden md:inline-flex items-center font-medium text-[hsl(var(--primary))] hover:opacity-80 transition-smooth group mt-4 md:mt-0">
            {t('popular.view_all')} 
            <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Product Grid */}
        {loading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse bg-[hsl(var(--muted))] rounded-[8px] aspect-[3/4]"></div>)}
          </div> : products.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map(product => {
          return <Link to={`/product/${product.id}?type=shop`} key={product.id} className="flex flex-col h-full bg-white border border-[rgba(224,224,224,0.5)] rounded-[8px] overflow-hidden hover:shadow-hover transition-smooth group relative">
                  {/* Image Area */}
                  <div className="relative aspect-square overflow-hidden bg-[rgba(247,247,247,0.2)]">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-[hsl(var(--secondary))]">
                        {t('product.no_image')}
                      </div>}
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 bg-[hsl(var(--primary))] text-white text-[10px] md:text-[12px] font-medium px-2 py-1 rounded-[6px] shadow-sm z-10">
                      {t('popular.official')}
                    </div>

                    {product.condition === 'Neu' || product.condition === 'Wie neu' ? <div className="absolute bottom-2 right-2 bg-[hsl(var(--accent))] text-white p-1.5 rounded-full shadow-sm z-10" title={t('popular.verified')}>
                        <ShieldCheck size={12} />
                      </div> : null}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-grow p-4 gap-2">
                    {product.fachbereich && product.fachbereich.length > 0 && <div className="self-start border border-[hsl(var(--border))] bg-white text-[hsl(var(--secondary))] text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {product.fachbereich[0]}
                      </div>}
                    <h3 className="font-medium text-[14px] md:text-[16px] text-[hsl(var(--foreground))] line-clamp-2 group-hover:text-[hsl(var(--primary))] transition-fast">
                      {product.name}
                    </h3>
                    <div className="mt-auto pt-2">
                      <span className="font-bold text-[16px] md:text-[18px] text-[hsl(var(--foreground))]">
                        €{product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Footer / Action */}
                  <div className="p-4 pt-0">
                    <button onClick={e => handleAddToCart(e, product)} className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--primary))] text-white text-[14px] font-medium py-2.5 rounded-[8px] hover:bg-[#0000CC] active:scale-[0.98] transition-smooth shadow-button">
                      <ShoppingCart size={16} />
                      <span className="hidden sm:inline">{t('product.add_to_cart')}</span>
                      <span className="sm:hidden">{t('popular.buy')}</span>
                    </button>
                  </div>
                </Link>;
        })}
          </div> : (/* Empty State */
      <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-[hsl(var(--border))] rounded-[8px] bg-[rgba(247,247,247,0.3)] text-center">
            <div className="w-[64px] h-[64px] md:w-[80px] md:h-[80px] bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
              <PackageSearch className="w-[32px] h-[32px] md:w-[40px] md:h-[40px] text-[hsl(var(--secondary))]" />
            </div>
            <h3 className="font-['Playfair_Display'] font-semibold text-[20px] md:text-[24px] text-[hsl(var(--foreground))] mb-2">
              {t('popular.empty_title')}
            </h3>
            <p className="text-[hsl(var(--secondary))] max-w-[448px] mb-6">
              {t('popular.empty_body')}
            </p>
            <Link to="/marketplace" className="inline-flex items-center justify-center border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] font-medium px-6 py-2.5 rounded-[8px] hover:bg-[hsl(var(--muted))] transition-smooth">
              {t('popular.go_marketplace')}
            </Link>
          </div>)}

        {/* Mobile View All Link */}
        <div className="mt-8 text-center md:hidden">
          <Link to="/shop" className="inline-flex items-center font-medium text-[hsl(var(--primary))] hover:opacity-80 transition-smooth">
            {t('popular.view_all')} →
          </Link>
        </div>
      </div>
    </section>;
};
export default PopularProductsSection;
