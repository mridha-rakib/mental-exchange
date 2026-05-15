import { getLearningSubscriptionDetails } from '@/lib/learningApi.js';

const AUTH_PATHS = new Set([
  '/auth',
  '/auth/reset-password',
  '/auth/verify-email',
  '/reset-password',
  '/verify-email',
]);

export const getSafeAuthReturnPath = (fromLocation) => {
  if (!fromLocation) return '';

  const rawPath = typeof fromLocation === 'string'
    ? fromLocation
    : `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}`;

  const path = String(rawPath || '').trim();
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '';

  const pathname = path.split(/[?#]/)[0] || '/';
  if (AUTH_PATHS.has(pathname)) return '';

  return path;
};

export const hasActiveLearningSubscription = async (token) => {
  if (!token) return false;

  try {
    const details = await getLearningSubscriptionDetails({ token });
    return details?.subscription?.hasAccess === true;
  } catch {
    return false;
  }
};

export const getDefaultPostLoginPath = async ({ user, token } = {}) => {
  if (user?.is_admin === true) return '/admin';

  if (await hasActiveLearningSubscription(token)) {
    return '/learning/dashboard';
  }

  if (user?.is_seller === true) {
    return '/seller-dashboard';
  }

  return '/profile';
};

export const getPostLoginRedirectPath = async ({ user, token, fromLocation } = {}) => {
  const safeReturnPath = getSafeAuthReturnPath(fromLocation);
  if (safeReturnPath) return safeReturnPath;

  return getDefaultPostLoginPath({ user, token });
};
