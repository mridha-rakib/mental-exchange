import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/index.js';
import { getPlatformSettings } from '../utils/platformSettings.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
