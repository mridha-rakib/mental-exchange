import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const SellerRoute = ({ children }) => {
  const { isAuthenticated, isSeller, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    console.log('🛡️ SellerRoute: Redirecting unauthenticated user to /auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isSeller && !isAdmin) {
    console.log('🛡️ SellerRoute: Redirecting non-seller to /seller-info');
    return <Navigate to="/seller-info" replace />;
  }

  return children;
};

export default SellerRoute;
