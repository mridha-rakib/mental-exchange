import 'dotenv/config';
import { Router } from 'express';
import logger from '../utils/logger.js';

import checkoutRouter from './checkout.js';
import dhlLabelsRouter from './dhl-labels.js';
import trackingRouter from './tracking.js';
import favoritesRouter from './favorites.js';
import adminRouter from './admin.js';
import emailRouter from './email.js';
import verificationRouter from './verification.js';
import ordersRouter from './orders.js';
import returnsRouter from './returns.js';
import searchRouter from './search.js';
import settingsRouter from './settings.js';
import sellerRouter from './seller.js';
import learningRouter from './learning.js';
import marketplaceRouter from './marketplace.js';
import shopRouter from './shop.js';
import reviewsRouter from './reviews.js';

const router = Router();

export default function routes() {
  router.get('/health', (req, res) => {
    const timestamp = new Date().toISOString();
    logger.info('[HEALTH CHECK]', 'Health check request - Timestamp: ' + timestamp);
    res.status(200).json({
      status: 'ok',
      timestamp,
    });
  });

  logger.info('[ROUTES]', 'Registering /checkout routes');
  router.use('/checkout', checkoutRouter);

  logger.info('[ROUTES]', 'Registering /dhl-labels routes');
  router.use('/dhl-labels', dhlLabelsRouter);

  logger.info('[ROUTES]', 'Registering /tracking routes');
  router.use('/tracking', trackingRouter);

  logger.info('[ROUTES]', 'Registering /favorites routes');
  router.use('/favorites', favoritesRouter);

  logger.info('[ROUTES]', 'Registering /admin routes');
  router.use('/admin', adminRouter);

  logger.info('[ROUTES]', 'Registering /email routes');
  router.use('/email', emailRouter);

  logger.info('[ROUTES]', 'Registering /verification routes');
  router.use('/verification', verificationRouter);

  logger.info('[ROUTES]', 'Registering /orders routes');
  router.use('/orders', ordersRouter);

  logger.info('[ROUTES]', 'Registering /returns routes');
  router.use('/returns', returnsRouter);

  logger.info('[ROUTES]', 'Registering /search routes');
  router.use('/search', searchRouter);

  logger.info('[ROUTES]', 'Registering /settings routes');
  router.use('/settings', settingsRouter);

  logger.info('[ROUTES]', 'Registering /seller routes');
  router.use('/seller', sellerRouter);

  logger.info('[ROUTES]', 'Registering /learning routes');
  router.use('/learning', learningRouter);

  logger.info('[ROUTES]', 'Registering /marketplace routes');
  router.use('/marketplace', marketplaceRouter);

  logger.info('[ROUTES]', 'Registering /shop routes');
  router.use('/shop', shopRouter);

  logger.info('[ROUTES]', 'Registering /reviews routes');
  router.use('/reviews', reviewsRouter);

  logger.info('[ROUTES]', 'Stripe webhook is registered in main.js with express.raw() middleware');

  router.all(/^\/dhl($|\/)/, (req, res) => {
    const path = req.path;
    const method = req.method;
    logger.warn('[DEPRECATED ROUTE]', 'Deprecated /dhl route accessed - Method: ' + method + ', Path: ' + path);

    res.status(410).json({
      error: 'Gone',
      message: 'This route is deprecated. Use /dhl-labels instead',
      newEndpoint: '/dhl-labels/generate-label',
      timestamp: new Date().toISOString(),
    });
  });

  router.all(/^\/dhl-shipping($|\/)/, (req, res) => {
    const path = req.path;
    const method = req.method;
    logger.warn('[DEPRECATED ROUTE]', 'Deprecated /dhl-shipping route accessed - Method: ' + method + ', Path: ' + path);

    res.status(410).json({
      error: 'Gone',
      message: 'This route is deprecated. Use /dhl-labels instead',
      newEndpoint: '/dhl-labels/generate-label',
      timestamp: new Date().toISOString(),
    });
  });

  logger.info('[ROUTES]', 'All routes registered successfully');
  return router;
}
