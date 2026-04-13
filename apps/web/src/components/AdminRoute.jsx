import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    console.log('🛡️ AdminRoute: Redirecting unauthenticated user to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    console.log('🛡️ AdminRoute: Redirecting non-admin to /');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;