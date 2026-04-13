import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Generate unique tracking number in format ZB-XXXXXX-YYYY
 * ZB prefix, 6 random alphanumeric characters, hyphen, 4-digit year
 */
const generateTrackingNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `ZB-${randomPart}-${year}`;
};

// POST /tracking/generate
// Generate unique tracking number
router.post('/generate', async (req, res) => {
  logger.info('[TRACKING] Generate tracking number request');

  const trackingNumber = generateTrackingNumber();

  logger.info(`[TRACKING] Tracking number generated: ${trackingNumber}`);

  res.json({
    trackingNumber,
  });
});

export default router;