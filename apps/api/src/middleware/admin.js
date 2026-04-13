import logger from '../utils/logger.js';

/**
 * Admin authorization middleware
 * Checks if authenticated user has admin role
 * Must be used after auth middleware
 */
const admin = (req, res, next) => {
  if (!req.auth) {
    throw new Error('User not authenticated');
  }

  if (req.auth.is_admin !== true) {
    const userId = String(req.auth.id);
    logger.warn(`Admin access denied for user: ${userId}`);
    const error = new Error('Admin access required');
    error.status = 403;
    throw error;
  }

  const userId = String(req.auth.id);
  logger.info(`Admin access granted for user: ${userId}`);
  next();
};

export default admin;