import express from 'express';
import { getPlatformSettings } from '../utils/platformSettings.js';

const router = express.Router();

router.get('/fees', async (req, res) => {
  const settings = await getPlatformSettings();

  res.json({
    shipping_fee: settings.shipping_fee,
    service_fee: settings.service_fee,
    transaction_fee_percentage: settings.transaction_fee_percentage,
    verification_fee: settings.verification_fee,
  });
});

export default router;
