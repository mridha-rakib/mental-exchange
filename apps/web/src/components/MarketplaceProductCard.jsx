import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useFavorites } from '@/contexts/FavoritesContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getAuthToken } from '@/lib/getAuthToken.js';
import { toast } from 'sonner';

const MarketplaceProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { currentUser } = useAuth();
  const { isFavorite, loadFavorites } = useFavorites();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const isSold = product.status === 'sold';
  const isFav = isFavorite(product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSold) return;
    addToCart(product, 1);
    toast.success(t('product.added_to_cart'));
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const token = getAuthToken();
    if (!token || !currentUser) {
      toast.error(t('auth.login_required_favorites'));
      navigate('/auth');
      return;
    }

    try {
      const response = await apiServerClient.fetch('/favorites/toggle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product.id })
      });
      
      if (response.status === 401) {
        toast.error(t('auth.session_expired'));
        navigate('/auth');
        return;
      }
      
      if (!response.ok) throw new Error('Toggle failed');
      
      await loadFavorites();
      toast.success(isFav ? t('common.remove_favorite') : t('common.favorite_added'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(t('common.favorites_update_error'));
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white rounded-[var(--radius-md)] border border-[hsl(var(--border))] overflow-hidden hover:shadow-hover transition-smooth relative">
      {isSold && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
          <span className="bg-gray-900 text-white px-3 py-1.5 text-xs rounded-full font-medium tracking-wide">{t('product.sold')}</span>
        </div>
      )}
      
      <div className="relative aspect-[4/3] bg-[hsl(var(--muted-bg))] overflow-hidden">
        {product.image ? (
          <img 
            src={pb.files.getUrl(product, product.image)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{t('product.no_image')}</div>
        )}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm z-10">
          {product.condition}
        </div>
        
        <button 
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm hover:bg-white transition-colors z-10"
          aria-label={isFav ? t('common.remove_favorite') : t('common.favorite_added')}
        >
          <Heart size={14} className={isFav ? "fill-[#0000FF] text-[#0000FF]" : "text-gray-500"} />
        </button>
      </div>

      <div className="p-3 flex flex-col flex-grow">
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-[hsl(var(--secondary-text))] mb-1.5">
          <Star size={10} className="fill-yellow-400 text-yellow-400" />
          <span>4.8</span>
          <span className="mx-0.5">•</span>
          <span className="truncate">{product.seller_username || t('product.anonymous_seller')}</span>
        </div>
        
        <h3 className="font-['Playfair_Display'] font-semibold text-sm md:text-base leading-tight mb-1 line-clamp-2 group-hover:text-[hsl(var(--primary))] transition-colors">
          {product.name}
        </h3>
        
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-bold text-[hsl(var(--primary))] text-base md:text-lg">
            €{product.price.toFixed(2)}
          </span>
          <button 
            onClick={handleAddToCart}
            disabled={isSold}
            className="w-8 h-8 rounded-full bg-[hsl(var(--muted-bg))] flex items-center justify-center text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary))] hover:text-white transition-colors disabled:opacity-50"
            aria-label={t('product.add_to_cart')}
          >
            <ShoppingCart size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default MarketplaceProductCard;
