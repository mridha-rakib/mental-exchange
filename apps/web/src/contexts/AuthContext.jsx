import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(pb.authStore.model);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 useEffect triggered in AuthContext (Mount/Subscribe)');
    const unsubscribe = pb.authStore.onChange((token, model) => {
      console.log('🔄 AuthStore changed in AuthContext', { modelId: model?.id });
      setCurrentUser(model);
    });
    setLoading(false);
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
    return authData;
  };

  const signup = async (data) => {
    const record = await pb.collection('users').create({
      ...data,
      emailVisibility: true,
    }, { $autoCancel: false });
    await login(data.email, data.password);
    return record;
  };

  const logout = () => {
    pb.authStore.clear();
  };

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      await pb.collection('users').authRefresh({ $autoCancel: false });
      setCurrentUser(pb.authStore.model);
    }
  };

  const isSeller = currentUser?.is_seller === true;
  const isAdmin = currentUser?.is_admin === true;

  const value = {
    currentUser,
    login,
    signup,
    logout,
    refreshUser,
    isSeller,
    isAdmin,
    isAuthenticated: pb.authStore.isValid,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};