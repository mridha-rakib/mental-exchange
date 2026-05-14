import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient.js';
import { getAuthToken } from '@/lib/getAuthToken.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    const token = getAuthToken();

    if (!currentUser || !token) {
      setFavorites([]);
      return [];
    }

    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/favorites?perPage=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load favorites');
      }

      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items.filter((item) => item.product) : [];
      setFavorites(items);
      return items;
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    console.log('🔄 useEffect triggered in FavoritesContext (Sync DB on User Change)', { userId: currentUser?.id });
    if (currentUser) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [currentUser, loadFavorites]);

  const addToFavorites = async (productOrId) => {
    const productId = typeof productOrId === 'object' ? productOrId.id : productOrId;
    const product = typeof productOrId === 'object' ? productOrId : null;
    const token = getAuthToken();

    if (!currentUser || !token) {
      throw new Error('Must be logged in to add favorites');
    }

    try {
      const existing = favorites.find(fav => fav.product_id === productId);
      if (existing) return;

      const response = await apiServerClient.fetch('/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }

      const data = await response.json().catch(() => ({}));
      const favorite = data.favorite || {};

      setFavorites((prev) => {
        if (prev.some((item) => item.product_id === productId)) {
          return prev;
        }

        return [
          {
            id: favorite.id || data.favorite_id || productId,
            user_id: favorite.user_id || currentUser.id,
            product_id: favorite.product_id || productId,
            product: favorite.product || product,
            created_at: favorite.created_at || new Date().toISOString(),
          },
          ...prev,
        ];
      });
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  };

  const removeFromFavorites = async (productId) => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Must be logged in to remove favorites');
    }

    try {
      const favorite = favorites.find(fav => fav.product_id === productId);
      if (!favorite) return;

      const response = await apiServerClient.fetch(`/favorites/product/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to remove favorite');
      }

      setFavorites((prev) => prev.filter((item) => item.product_id !== productId));
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  };

  const isFavorite = (productId) => {
    return favorites.some(fav => fav.product_id === productId);
  };

  const value = {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    loadFavorites
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};
