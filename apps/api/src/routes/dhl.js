// TEST/MOCK ONLY - Do not use for production order labels. Use dhl-labels.js instead. This route is for development and testing purposes only.

import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';

const router = express.Router();

const DHL_API_BASE = 'https://api.dhl.com';
const DHL_API_KEY = process.env.DHL_API_KEY;
const DHL_API_SECRET = process.env.DHL_API_SECRET;
const DHL_CUSTOMER_NUMBER = process.env.DHL_CUSTOMER_NUMBER;
const DHL_BILLING_NUMBER = process.env.DHL_BILLING_NUMBER;

/**
 * Generate mock DHL label
 * In production, this would call the actual DHL API
 */
const generateMockLabel = (shipmentType, fromAddress, toAddress, productId) => {
  const shipmentTypeStr = String(shipmentType).trim();
  const trackingNumber = `${shipmentTypeStr === 'verification' ? 'VER' : 'PUR'}${Date.now().toString().slice(-9)}`;
  const labelId = `LBL${Date.now()}`;

  // Mock PDF content (base64 encoded)
  const mockPdfBase64 = Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(DHL Shipping Label) Tj
0 -20 Td
(Tracking: ${trackingNumber}) Tj
0 -20 Td
(From: ${String(fromAddress.name).trim()}) Tj
0 -20 Td
(To: ${String(toAddress.name).trim()}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000203 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
453
%%EOF`
  ).toString('base64');

  return {
    trackingNumber,
    labelId,
    labelUrl: `https://dhl.example.com/labels/${labelId}`,
    pdf: mockPdfBase64,
    shipmentType: shipmentTypeStr,
    fromAddress,
    toAddress,
    createdAt: new Date().toISOString(),
  };
};

// POST /dhl/generate-label
// Generate DHL shipping label for verification or purchase shipments
router.post('/generate-label', async (req, res) => {
  const { shipmentType, fromAddress, toAddress, weight, dimensions, productId } = req.body;

  // Ensure values are strings
  const shipmentTypeStr = String(shipmentType).trim();
  const productIdStr = productId ? String(productId) : null;

  logger.info(`[DHL] Generate label request - Type: ${shipmentTypeStr}, Product: ${productIdStr}`);

  // Validate required fields
  if (!shipmentTypeStr || !fromAddress || !toAddress) {
    return res.status(400).json({
      error: 'Missing required fields: shipmentType, fromAddress, toAddress',
    });
  }

  // Validate shipment type
  if (!['verification', 'purchase'].includes(shipmentTypeStr)) {
    return res.status(400).json({
      error: 'Invalid shipmentType. Must be "verification" or "purchase"',
    });
  }

  // Validate address objects
  if (!fromAddress.name || !fromAddress.street || !fromAddress.city || !fromAddress.zip) {
    return res.status(400).json({
      error: 'Invalid fromAddress. Required: name, street, city, zip',
    });
  }

  if (!toAddress.name || !toAddress.street || !toAddress.city || !toAddress.zip) {
    return res.status(400).json({
      error: 'Invalid toAddress. Required: name, street, city, zip',
    });
  }

  try {
    // Generate mock DHL label (in production, call actual DHL API)
    const label = generateMockLabel(shipmentTypeStr, fromAddress, toAddress, productIdStr);

    logger.info(`[DHL] Label generated successfully - Tracking: ${label.trackingNumber}, Type: ${shipmentTypeStr}`);

    res.json({
      success: true,
      labelUrl: label.labelUrl,
      trackingNumber: label.trackingNumber,
      labelId: label.labelId,
      pdf: label.pdf,
      shipmentType: label.shipmentType,
      createdAt: label.createdAt,
    });
  } catch (error) {
    logger.error(`[DHL] Label generation failed - Error: ${error.message}`);
    throw error;
  }
});

// GET /dhl/label/:trackingNumber
// Retrieve DHL label by tracking number
router.get('/label/:trackingNumber', async (req, res) => {
  const { trackingNumber } = req.params;

  // Ensure trackingNumber is a string
  const trackingNumberStr = String(trackingNumber).trim();

  if (!trackingNumberStr) {
    return res.status(400).json({ error: 'trackingNumber is required' });
  }

  logger.info(`[DHL] Retrieve label request - Tracking: ${trackingNumberStr}`);

  try {
    // In production, call actual DHL API to retrieve label
    // For now, return mock response
    res.json({
      trackingNumber: trackingNumberStr,
      labelUrl: `https://dhl.example.com/labels/${trackingNumberStr}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`[DHL] Label retrieval failed - Error: ${error.message}`);
    throw error;
  }
});

// POST /dhl/create-label (legacy endpoint)
// Create DHL Shipping Label
router.post('/create-label', async (req, res) => {
  const { orderId, recipientName, recipientAddress, recipientCity, recipientZip, weight, reference } = req.body;

  // Ensure all values are strings
  const orderIdStr = String(orderId);
  const recipientNameStr = String(recipientName).trim();
  const recipientAddressStr = String(recipientAddress).trim();
  const recipientCityStr = String(recipientCity).trim();
  const recipientZipStr = String(recipientZip).trim();
  const referenceStr = String(reference).trim();
  const weightNum = parseFloat(weight) || 1;

  if (!orderIdStr || !recipientNameStr || !recipientAddressStr || !recipientCityStr || !recipientZipStr || !referenceStr) {
    return res.status(400).json({
      error: 'Missing required fields: orderId, recipientName, recipientAddress, recipientCity, recipientZip, weight, reference',
    });
  }

  logger.info(`[DHL] Create label request - Order: ${orderIdStr}`);

  try {
    const dhlPayload = {
      orderId: orderIdStr,
      recipientName: recipientNameStr,
      recipientAddress: recipientAddressStr,
      recipientCity: recipientCityStr,
      recipientZip: recipientZipStr,
      weight: weightNum,
      reference: referenceStr,
      customerNumber: DHL_CUSTOMER_NUMBER,
      billingNumber: DHL_BILLING_NUMBER,
    };

    // In production, call actual DHL API
    // For now, return mock response
    const trackingNumber = `DHL${Date.now().toString().slice(-9)}`;

    logger.info(`[DHL] Label created - Order: ${orderIdStr}, Tracking: ${trackingNumber}`);

    res.json({
      trackingNumber,
      labelUrl: `https://dhl.example.com/labels/${trackingNumber}`,
    });
  } catch (error) {
    logger.error(`[DHL] Label creation failed - Error: ${error.message}`);
    throw error;
  }
});

export default router;