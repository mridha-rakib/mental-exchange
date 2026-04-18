import 'dotenv/config';
import PocketBase from 'pocketbase';
import pb from '../utils/pocketbaseClient.js';
import { POCKETBASE_HOST } from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware
 * Extracts and validates JWT token from Authorization header
 * Attaches decoded user data to req.auth
 * If token is invalid or missing, sets req.auth = null and continues
 * Throws 401 error if token is present but invalid
 */
const auth = async (req, res, next) => {
  // ALWAYS set req.auth = null as default
  req.auth = null;

  const authHeader = req.headers.authorization;

  // Missing Authorization is normal for public routes.
  if (!authHeader) {
    return next();
  }

  // Log exact Authorization header value (first 50 chars)
  const headerPreview = String(authHeader).substring(0, 50);
  logger.info('[AUTH] Authorization header received: ' + headerPreview + (authHeader.length > 50 ? '...' : ''));

  // Extract Bearer token using regex
  const authHeaderStr = String(authHeader).trim();
  const bearerMatch = authHeaderStr.match(/^Bearer\s+(.+)$/i);

  if (!bearerMatch || !bearerMatch[1]) {
    logger.warn('[AUTH] FAILED: Authorization header does not match Bearer format');
    return next();
  }

  const token = bearerMatch[1].trim();
  const tokenLength = String(token).length;
  logger.info('[AUTH] Token extracted. Length: ' + tokenLength);

  if (!token || String(token).trim().length === 0) {
    logger.warn('[AUTH] FAILED: Token is empty after extraction');
    return next();
  }

  try {
    const requestPb = new PocketBase(POCKETBASE_HOST);
    requestPb.autoCancellation(false);
    requestPb.authStore.save(token, null);

    const authData = await requestPb.collection('users').authRefresh();
    const userRecord = authData?.record;

    if (!userRecord?.id) {
      logger.warn('[AUTH] FAILED: PocketBase authRefresh returned no user record');
      return next();
    }

    req.auth = {
      id: String(userRecord.id),
      email: String(userRecord.email),
      is_admin: userRecord.is_admin === true,
      is_seller: userRecord.is_seller === true,
    };

    logger.info('[AUTH] SUCCESS via PocketBase authRefresh - User ID: ' + req.auth.id + ', Email: ' + req.auth.email + ', Admin: ' + req.auth.is_admin);
  } catch (authError) {
    const errorMsg = authError && authError.message ? String(authError.message) : 'Unknown error';
    logger.warn('[AUTH] FAILED: PocketBase token validation failed - ' + errorMsg);
    req.auth = null;
  }

  next();
};

/**
 * Require authentication middleware
 * Must be used AFTER auth middleware
 * Checks if req.auth.id exists and throws 401 if not authenticated
 * Throws error so errorMiddleware catches it
 */
const requireAuth = (req, res, next) => {
  if (!req.auth || !req.auth.id) {
    logger.warn('[AUTH] Unauthorized access attempt - no valid authentication');
    const error = new Error('Unauthorized: Authentication required');
    error.status = 401;
    throw error;
  }

  logger.info('[AUTH] Authenticated user proceeding - ID: ' + req.auth.id);
  next();
};

export { auth as default, requireAuth };
