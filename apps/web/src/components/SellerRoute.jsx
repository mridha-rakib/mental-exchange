import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const SellerRoute = ({ children }) => {
  const { isAuthenticated, isSeller } = useAuth();

  if (!isAuthenticated) {
    console.log('🛡️ SellerRoute: Redirecting unauthenticated user to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (!isSeller) {
    console.log('🛡️ SellerRoute: Redirecting non-seller to /seller-info');
    return <Navigate to="/seller-info" replace />;
  }

  return children;
};

export default SellerRoute;