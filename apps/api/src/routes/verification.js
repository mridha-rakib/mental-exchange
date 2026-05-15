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
  const { productId, sellerId } = req.body;
  const userId = req.auth.id;

  logger.info(`[VERIFICATION] Pay-fee request - User: ${userId}, Product: ${productId}, Seller: ${sellerId}`);

  if (!productId || !sellerId) {
    return res.status(400).json({ error: 'Missing required fields: productId, sellerId' });
  }

  if (userId !== sellerId) {
    logger.warn(`[VERIFICATION] User ID mismatch - Auth: ${userId}, Seller: ${sellerId}`);
    const error = new Error('Unauthorized: You can only pay verification fees for your own products');
    error.status = 403;
    throw error;
  }

  const productIdStr = String(productId);
  const sellerIdStr = String(sellerId);

  const product = await pb.collection('products').getOne(productIdStr);

  if (product.seller_id !== sellerIdStr) {
    logger.warn(`[VERIFICATION] Unauthorized verification attempt - User: ${userId}, Product: ${productIdStr}`);
    const error = new Error('Unauthorized: seller does not own this product');
    error.status = 403;
    throw error;
  }

  if (product.status === 'verified' || product.status === 'pending_verification') {
    logger.warn(`[VERIFICATION] Product already in verification - Product: ${productIdStr}, Status: ${product.status}`);
    return res.status(400).json({ error: `Product is already ${product.status}` });
  }

  const seller = await pb.collection('users').getOne(sellerIdStr);
  const fees = await getPlatformSettings();
  const verificationFee = fees.verification_fee;

  logger.info(`[VERIFICATION] Creating Stripe checkout session - Product: ${productIdStr}, Seller: ${sellerIdStr}`);

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Qualitätsprüfung',
            description: `Verifizierung für: ${product.name}`,
          },
          unit_amount: Math.round(verificationFee * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/verification-success?sessionId={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/verification-cancel?productId=${productIdStr}`,
    metadata: {
      productId: productIdStr,
      sellerId: sellerIdStr,
      userEmail: seller.email,
      productName: product.name,
      type: 'verification_fee',
      verificationFee: String(verificationFee),
    },
  });

  logger.info(`[VERIFICATION] Stripe checkout session created - Session: ${session.id}, Product: ${productIdStr}`);

  res.json({
    checkoutUrl: session.url,
    sessionId: session.id,
  });
});

export default router;
