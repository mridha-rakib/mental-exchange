import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { getTrackingStatus } from '../utils/dhlService.js';
import { auth, requireAuth } from '../middleware/index.js';

const router = express.Router();

router.use(auth);
router.use(requireAuth);

const trackingRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Math.max(1, Number(process.env.DHL_TRACKING_RATE_LIMIT || 30)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests, please try again later' },
});

const canAccessOrder = (req, order) => (
  req.auth?.is_admin === true ||
  String(order.buyer_id || '') === String(req.auth?.id || '') ||
  String(order.seller_id || '') === String(req.auth?.id || '')
);

router.post('/generate', (_req, res) => {
  res.status(410).json({
    error: 'Gone',
    message: 'Internal tracking numbers are deprecated. Use DHL shipment tracking from paid orders instead.',
  });
});

router.get('/orders/:orderId', trackingRateLimit, async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!canAccessOrder(req, order)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const trackingNumber = order.tracking_number || order.dhl_tracking_number || order.dhl_shipment_number || '';
  if (!trackingNumber) {
    return res.status(404).json({ error: 'No DHL tracking number is available for this order' });
  }

  try {
    const tracking = await getTrackingStatus(trackingNumber);

    return res.json({
      order_id: order.id,
      tracking_number: trackingNumber,
      tracking_url: `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${encodeURIComponent(trackingNumber)}`,
      ...tracking,
    });
  } catch (error) {
    logger.error(`[TRACKING] DHL tracking failed - Order: ${order.id}, Tracking: ${trackingNumber}, Error: ${error.message}`);
    return res.status(400).json({
      error: 'DHL tracking lookup failed',
      details: error.message,
    });
  }
});

export default router;
