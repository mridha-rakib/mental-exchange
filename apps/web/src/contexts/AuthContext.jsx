import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext();

const generateUserId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

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
    const authData = await pb.collection('users').authWithPassword(email.trim(), password, { $autoCancel: false });
    return authData;
  };

  const requestPasswordReset = async (email) => (
    pb.collection('users').requestPasswordReset(email.trim(), { $autoCancel: false })
  );

  const confirmPasswordReset = async ({ token, password, passwordConfirm }) => (
    pb.collection('users').confirmPasswordReset(token, password, passwordConfirm, { $autoCancel: false })
  );

  const requestEmailVerification = async (email) => (
    pb.collection('users').requestVerification(email.trim(), { $autoCancel: false })
  );

  const confirmEmailVerification = async (token) => (
    pb.collection('users').confirmVerification(token, { $autoCancel: false })
  );

  const signup = async (data) => {
    const payload = {
      ...data,
      email: data.email.trim(),
      name: data.name?.trim() || '',
      university: data.university?.trim() || '',
      user_id: data.user_id || generateUserId(),
      emailVisibility: true,
    };

    const record = await pb.collection('users').create({
      ...payload,
    }, { $autoCancel: false });

    const verificationSent = await requestEmailVerification(payload.email)
      .then(() => true)
      .catch(() => false);

    let authData = null;
    try {
      authData = await login(payload.email, data.password);
    } catch (error) {
      const message = `${error?.message || ''} ${error?.response?.message || ''}`.toLowerCase();
      if (message.includes('verified') || message.includes('confirm') || message.includes('verification')) {
        return { record, verificationSent, requiresVerification: true };
      }

      throw error;
    }

    return {
      record,
      token: authData?.token || '',
      verificationSent,
      requiresVerification: false,
    };
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
    requestPasswordReset,
    confirmPasswordReset,
    requestEmailVerification,
    confirmEmailVerification,
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
