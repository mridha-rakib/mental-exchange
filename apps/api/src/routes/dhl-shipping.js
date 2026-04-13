// DEPRECATED - Use dhl-labels.js for order label generation instead. This route is kept for backward compatibility only.

import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

const DHL_API_BASE = 'https://api.dhl.com';
const DHL_API_KEY = process.env.DHL_API_KEY;

// Generate DHL Shipping Label
router.post('/generate-label', async (req, res) => {
  const { orderId, buyerData } = req.body;

  // Ensure values are strings
  const orderIdStr = String(orderId);

  if (!orderIdStr || !buyerData) {
    return res.status(400).json({ error: 'Missing required fields: orderId, buyerData' });
  }

  // Fetch order details
  const order = await pb.collection('orders').getOne(orderIdStr);

  if (!order) {
    return res.status(400).json({ error: `Order ${orderIdStr} not found` });
  }

  // Ensure buyer data fields are strings
  const buyerName = String(buyerData.name || '').trim();
  const buyerAddress = String(buyerData.address || '').trim();
  const buyerCity = String(buyerData.city || '').trim();
  const buyerZip = String(buyerData.zip || '').trim();
  const buyerCountry = String(buyerData.country || 'DE').trim();
  const buyerWeight = parseFloat(buyerData.weight) || 1;

  // Prepare DHL payload with buyer's shipping address
  const dhlPayload = {
    shipmentType: 'order',
    orderId: orderIdStr,
    recipientName: buyerName,
    recipientAddress: buyerAddress,
    recipientCity: buyerCity,
    recipientZip: buyerZip,
    recipientCountry: buyerCountry,
    weight: buyerWeight,
  };

  const response = await axios.post(
    `${DHL_API_BASE}/shipping/labels`,
    dhlPayload,
    {
      headers: {
        'Authorization': `Bearer ${DHL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.data) {
    throw new Error(`DHL API error: ${response.status} ${response.statusText}`);
  }

  logger.info(`DHL label generated for order ${orderIdStr}`);
  res.json({
    labelUrl: response.data.labelUrl,
    trackingNumber: response.data.trackingNumber,
  });
});

export default router;