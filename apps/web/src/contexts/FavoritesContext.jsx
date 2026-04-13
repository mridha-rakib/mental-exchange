import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
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
    if (!currentUser) return;

    setLoading(true);
    try {
      const items = await pb.collection('favorites').getFullList({
        filter: `user_id = "${currentUser.id}"`,
        $autoCancel: false
      });

      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          try {
            const product = await pb.collection('products').getOne(item.product_id, { $autoCancel: false });
            return { ...item, product };
          } catch (err) {
            return null;
          }
        })
      );

      setFavorites(itemsWithProducts.filter(item => item !== null));
    } catch (error) {
      console.error('Failed to load favorites:', error);
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

  const addToFavorites = async (productId) => {
    if (!currentUser) {
      throw new Error('Must be logged in to add favorites');
    }

    try {
      const existing = favorites.find(fav => fav.product_id === productId);
      if (existing) return;

      await pb.collection('favorites').create({
        user_id: currentUser.id,
        product_id: productId
      }, { $autoCancel: false });

      await loadFavorites();
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  };

  const removeFromFavorites = async (productId) => {
    try {
      const favorite = favorites.find(fav => fav.product_id === productId);
      if (!favorite) return;

      await pb.collection('favorites').delete(favorite.id, { $autoCancel: false });
      await loadFavorites();
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