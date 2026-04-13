// DEPRECATED - This file is kept for reference only.
// All Stripe webhook handling has been moved to stripe-webhook.js
// This route is no longer used in production.

import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  logger.warn('[STRIPE] Deprecated stripe.js webhook endpoint called - use stripe-webhook.js instead');
  res.json({ received: true });
});

export default router;