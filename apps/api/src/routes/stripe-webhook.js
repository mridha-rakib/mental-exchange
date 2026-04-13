import 'dotenv/config';
import Stripe from 'stripe';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { orderHandler } from '../utils/orderHandler.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error(`[WEBHOOK] Signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  res.json({ received: true });

  handleWebhookEvent(event).catch((error) => {
    logger.error(`[WEBHOOK] Async processing failed: ${error.message}`);
    logger.error(error.stack);
  });
};

const parseShippingAddress = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid shipping_address metadata');
  }
};

const parseCartItemIds = (raw) => {
  return String(raw || '')
    .split(',')
    .map((id) => String(id).trim())
    .filter(Boolean);
};

const loadCartItems = async (cartItemIds) => {
  const items = [];
  for (const cartItemId of cartItemIds) {
    const item = await pb.collection('cart_items').getOne(cartItemId);
    items.push(item);
  }
  return items;
};

const findSessionByPaymentIntent = async (paymentIntentId) => {
  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });

    return sessions?.data?.[0] || null;
  } catch (error) {
    logger.warn(`[WEBHOOK] Could not load checkout session for PI ${paymentIntentId}: ${error.message}`);
    return null;
  }
};

const ensureMarketplaceMetadata = (metadata) => {
  const { buyer_id, buyer_name, buyer_email, shipping_address, cart_item_ids, type } = metadata || {};

  if (!buyer_id || !buyer_name || !buyer_email || !shipping_address || !cart_item_ids || !type) {
    throw new Error('Missing required metadata fields: buyer_id, buyer_name, buyer_email, shipping_address, cart_item_ids, type');
  }

  if (type !== 'marketplace_order') {
    throw new Error(`Invalid payment type: ${type}`);
  }

  return { buyer_id, buyer_name, buyer_email, shipping_address, cart_item_ids, type };
};

const processMarketplaceOrder = async ({ paymentIntentId, session, fallbackMetadata = {} }) => {
  const metadata = session?.metadata || fallbackMetadata || {};
  const { buyer_id, shipping_address, cart_item_ids } = ensureMarketplaceMetadata(metadata);

  const shippingAddress = parseShippingAddress(shipping_address);
  const cartItemIds = parseCartItemIds(cart_item_ids);

  if (cartItemIds.length === 0) {
    throw new Error('No cart items found in metadata');
  }

  const cartItems = await loadCartItems(cartItemIds);

  for (const cartItem of cartItems) {
    const productId = String(cartItem.product_id).trim();
    const productType = cartItem.product_type === 'shop' ? 'shop' : 'marketplace';
    let sellerId = '';

    if (productType === 'marketplace') {
      const product = await pb.collection('products').getOne(productId);
      sellerId = String(product.seller_id || '').trim();
    }

    const existingOrder = await pb.collection('orders')
      .getFirstListItem(`payment_intent_id="${paymentIntentId}" && product_id="${productId}"`)
      .catch(() => null);

    if (existingOrder) {
      logger.info(`[WEBHOOK] Existing order found for PI ${paymentIntentId} and product ${productId}, skipping duplicate create`);
      await pb.collection('cart_items').delete(cartItem.id).catch(() => { });
      continue;
    }

    await orderHandler({
      buyerId: buyer_id,
      sellerId,
      productId,
      quantity: parseInt(cartItem.quantity, 10) || 1,
      shippingAddress,
      paymentIntentId,
      productType,
      shippingFee: metadata.shipping_fee,
      serviceFee: metadata.service_fee,
      transactionFeePercentage: metadata.transaction_fee_percentage,
    });

    await pb.collection('cart_items').delete(cartItem.id).catch((error) => {
      logger.warn(`[WEBHOOK] Failed to delete cart item ${cartItem.id}: ${error.message}`);
    });
  }
};

const processVerificationFee = async ({ paymentIntentId, session, fallbackMetadata = {} }) => {
  const metadata = session?.metadata || fallbackMetadata || {};
  const productId = String(metadata.productId || metadata.product_id || '').trim();
  const sellerId = String(metadata.sellerId || metadata.seller_id || '').trim();

  if (!productId || !sellerId) {
    throw new Error('Missing required verification metadata: productId, sellerId');
  }

  const product = await pb.collection('products').getOne(productId);

  if (String(product.seller_id).trim() != sellerId) {
    throw new Error(`Verification seller mismatch for product ${productId}`);
  }

  const alreadyProcessed =
    product.status === 'pending_verification' ||
    product.status === 'verified' ||
    String(product.verification_payment_intent_id || '').trim() === paymentIntentId;

  if (alreadyProcessed) {
    logger.info(`[WEBHOOK] Verification payment already processed for product ${productId}`);
    return;
  }

  await pb.collection('products').update(productId, {
    status: 'pending_verification',
    verification_requested_at: new Date().toISOString(),
    verification_fee_paid: true,
    verification_fee_paid_at: new Date().toISOString(),
    verification_payment_intent_id: paymentIntentId,
    verification_checkout_session_id: session?.id || null,
  });

  logger.info(`[WEBHOOK] Verification payment processed - Product: ${productId}, Seller: ${sellerId}`);
};

const processSessionByType = async ({ paymentIntentId, session, fallbackMetadata = {} }) => {
  const metadata = session?.metadata || fallbackMetadata || {};
  const type = String(metadata.type || '').trim();

  if (type === 'marketplace_order') {
    await processMarketplaceOrder({ paymentIntentId, session, fallbackMetadata });
    return;
  }

  if (type === 'verification_fee') {
    await processVerificationFee({ paymentIntentId, session, fallbackMetadata });
    return;
  }

  throw new Error(`Unsupported payment type in metadata: ${type || 'missing'}`);
};

const handlePaymentIntentSucceeded = async (paymentIntent) => {
  const paymentIntentId = String(paymentIntent.id).trim();

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Payment intent not succeeded: ${paymentIntent.status}`);
  }

  const session = await findSessionByPaymentIntent(paymentIntentId);

  await processSessionByType({
    paymentIntentId,
    session,
    fallbackMetadata: paymentIntent.metadata || {},
  });
};

const handleCheckoutSessionCompleted = async (session) => {
  if (session.payment_status !== 'paid') {
    throw new Error(`Checkout session not paid: ${session.payment_status}`);
  }

  const paymentIntentId = String(session.payment_intent || '').trim();
  if (!paymentIntentId) {
    throw new Error('checkout.session.completed without payment_intent');
  }

  await processSessionByType({
    paymentIntentId,
    session,
    fallbackMetadata: session.metadata || {},
  });
};

const handleWebhookEvent = async (event) => {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'charge.refunded':
      logger.info('[WEBHOOK] charge.refunded received - no handler implemented yet');
      break;
    default:
      logger.info(`[WEBHOOK] Ignoring event type: ${event.type}`);
      break;
  }
};

export default stripeWebhookHandler;
