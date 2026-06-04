import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/index.js';
import { getPlatformSettings } from '../utils/platformSettings.js';
import { createProductVerificationAudit } from '../utils/productValidation.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const QUALITY_VERIFICATION_CONDITIONS = new Set(['Neu', 'Wie neu']);

const normalizeProductIds = (body = {}) => {
  const rawProductIds = Array.isArray(body.productIds)
    ? body.productIds
    : typeof body.productIds === 'string'
      ? body.productIds.split(',')
      : [body.productId];

  return [...new Set(rawProductIds
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
};

router.post('/request-validation', requireAuth, async (req, res) => {
  const { productId } = req.body;
  const userId = req.auth.id;
  const productIdStr = String(productId || '').trim();

  if (!productIdStr) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const product = await pb.collection('products').getOne(productIdStr, { $autoCancel: false });

  if (String(product.seller_id || '').trim() !== String(userId).trim()) {
    const error = new Error('Unauthorized: seller does not own this product');
    error.status = 403;
    throw error;
  }

  if (product.condition === 'Neu' || product.condition === 'Wie neu') {
    return res.status(400).json({ error: 'Quality verification products must use the verification fee flow' });
  }

  const requestedAt = new Date().toISOString();
  const updatedProduct = await pb.collection('products').update(productIdStr, {
    status: 'pending_verification',
    verification_status: 'pending',
    validation_requested_at: requestedAt,
    validation_reviewed_at: '',
    validation_admin_id: '',
    validation_notes: '',
  }, { $autoCancel: false });

  await createProductVerificationAudit({
    product: updatedProduct,
    status: 'pending',
  });

  logger.info(`[VERIFICATION] Product submitted for admin validation - Product: ${productIdStr}, Seller: ${userId}`);

  res.json({
    success: true,
    productId: productIdStr,
    status: updatedProduct.status,
    verification_status: updatedProduct.verification_status,
  });
});

/**
 * POST /verification/pay-fee
 * Create Stripe Checkout Session for product verification fee
 */
router.post('/pay-fee', requireAuth, async (req, res) => {
  const { sellerId } = req.body;
  const userId = req.auth.id;
  const productIds = normalizeProductIds(req.body);

  logger.info(`[VERIFICATION] Pay-fee request - User: ${userId}, Products: ${productIds.join(',')}, Seller: ${sellerId}`);

  if (productIds.length === 0 || !sellerId) {
    return res.status(400).json({ error: 'Missing required fields: productIds, sellerId' });
  }

  if (userId !== sellerId) {
    logger.warn(`[VERIFICATION] User ID mismatch - Auth: ${userId}, Seller: ${sellerId}`);
    const error = new Error('Unauthorized: You can only pay verification fees for your own products');
    error.status = 403;
    throw error;
  }

  const sellerIdStr = String(sellerId);
  const productRecords = [];

  for (const productId of productIds) {
    const product = await pb.collection('products').getOne(productId, { $autoCancel: false });

    if (product.seller_id !== sellerIdStr) {
      logger.warn(`[VERIFICATION] Unauthorized verification attempt - User: ${userId}, Product: ${productId}`);
      const error = new Error('Unauthorized: seller does not own this product');
      error.status = 403;
      throw error;
    }

    if (!QUALITY_VERIFICATION_CONDITIONS.has(product.condition)) {
      return res.status(400).json({ error: `Product ${product.id} does not require paid quality verification` });
    }

    if (
      product.status === 'active'
      || product.status === 'verified'
      || product.status === 'pending_verification'
      || product.verification_fee_paid === true
      || String(product.verification_payment_intent_id || '').trim()
    ) {
      logger.warn(`[VERIFICATION] Product already in verification/listing flow - Product: ${product.id}, Status: ${product.status}`);
      return res.status(400).json({ error: `Product ${product.id} is already ${product.status}` });
    }

    productRecords.push(product);
  }

  const seller = await pb.collection('users').getOne(sellerIdStr);
  const fees = await getPlatformSettings();
  const verificationFee = fees.verification_fee;
  const firstProduct = productRecords[0];
  const productCount = productRecords.length;
  const productName = productCount === 1
    ? firstProduct.name
    : `${productCount} products for quality verification`;
  const productKind = productRecords.every((product) => product.product_type === 'Consumable') ? 'consumable' : 'item';
  const productIdList = productRecords.map((product) => product.id).join(',');

  logger.info(`[VERIFICATION] Creating Stripe checkout session - Products: ${productIdList}, Seller: ${sellerIdStr}`);

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Qualitätsprüfung',
            description: `Verifizierung für: ${productName}`,
          },
          unit_amount: Math.round(verificationFee * 100),
        },
        quantity: productCount,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/verification-success?sessionId={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/verification-cancel?productId=${firstProduct.id}&productIds=${encodeURIComponent(productIdList)}`,
    metadata: {
      productId: firstProduct.id,
      productIds: productIdList,
      productCount: String(productCount),
      productKind,
      sellerId: sellerIdStr,
      userEmail: seller.email,
      productName,
      type: 'verification_fee',
      verificationFee: String(verificationFee),
      totalVerificationFee: String(verificationFee * productCount),
    },
  });

  logger.info(`[VERIFICATION] Stripe checkout session created - Session: ${session.id}, Products: ${productIdList}`);

  res.json({
    checkoutUrl: session.url,
    sessionId: session.id,
    productIds,
    productCount,
  });
});

export default router;
