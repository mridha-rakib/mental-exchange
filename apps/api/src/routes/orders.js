import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/index.js';

const router = express.Router();

const SHIPPING_FEE = 4.99;
const SERVICE_FEE = 0.99;
const TRANSACTION_FEE_PERCENT = 0.07; // 7%

/**
 * POST /orders/create
 * Create new order with pending status
 * REQUIRES AUTHENTICATION
 *
 * Request body:
 * - seller_id (required): Seller user ID
 * - product_id (required): Product ID
 * - quantity (required): Order quantity
 * - shipping_address (required): Shipping address object {name, street, postalCode, city, country}
 *
 * Response:
 * - success: true
 * - order: {id, order_number, status, total}
 * - message: 'Order created successfully. Awaiting payment confirmation.'
 *
 * NOTE: DHL label generation, product status update, seller earnings, and emails
 * are handled by Stripe webhook AFTER payment confirmation, not here.
 */
router.post('/create', requireAuth, async (req, res) => {
  const { seller_id, product_id, quantity, shipping_address } = req.body;

  const buyer_id = req.auth.id;

  logger.info(`[ORDERS] Create order request - Buyer: ${buyer_id}, Seller: ${seller_id}, Product: ${product_id}`);

  if (!seller_id || !product_id || !quantity || !shipping_address) {
    return res.status(400).json({
      error: 'Missing required fields: seller_id, product_id, quantity, shipping_address',
    });
  }

  const buyerIdStr = String(buyer_id);
  const sellerIdStr = String(seller_id);
  const productIdStr = String(product_id);

  const product = await pb.collection('products').getOne(productIdStr);
  const productPrice = product.price || 0;

  if (product.seller_id !== sellerIdStr) {
    logger.warn(`[ORDERS] Product seller mismatch - Product: ${productIdStr}, Expected: ${sellerIdStr}, Actual: ${product.seller_id}`);
    return res.status(400).json({ error: 'Product does not belong to the specified seller' });
  }

  if (product.status === 'sold') {
    logger.warn(`[ORDERS] Product already sold - Product: ${productIdStr}`);
    return res.status(400).json({ error: 'Product is already sold' });
  }

  const quantityNum = parseInt(quantity, 10) || 1;
  const subtotal = productPrice * quantityNum;
  const totalAmount = subtotal + SHIPPING_FEE + SERVICE_FEE;

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const order = await pb.collection('orders').create({
    order_number: orderNumber,
    buyer_id: buyerIdStr,
    seller_id: sellerIdStr,
    product_id: productIdStr,
    quantity: quantityNum,
    price: productPrice,
    shipping_fee: SHIPPING_FEE,
    service_fee: SERVICE_FEE,
    total_amount: totalAmount,
    shipping_address: JSON.stringify(shipping_address),
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  const orderIdStr = String(order.id);

  logger.info(`[ORDERS] Order created with pending status - ID: ${orderIdStr}, Number: ${orderNumber}, Total: €${totalAmount.toFixed(2)}`);

  res.json({
    success: true,
    order: {
      id: orderIdStr,
      order_number: orderNumber,
      status: 'pending',
      total: totalAmount,
    },
    message: 'Order created successfully. Awaiting payment confirmation.',
  });
});

/**
 * POST /orders/:orderId/update-status
 * Update order status
 */
router.post('/:orderId/update-status', requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const orderIdStr = String(orderId);

  if (!status || !['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be one of: pending, paid, shipped, delivered, cancelled',
    });
  }

  logger.info(`[ORDERS] Update order status - Order: ${orderIdStr}, Status: ${status}`);

  const order = await pb.collection('orders').getOne(orderIdStr);

  if (order.buyer_id !== req.auth.id && order.seller_id !== req.auth.id && !req.auth.is_admin) {
    logger.warn(`[ORDERS] Unauthorized status update attempt - User: ${req.auth.id}, Order: ${orderIdStr}`);
    const error = new Error('Unauthorized: You do not have permission to update this order');
    error.status = 403;
    throw error;
  }

  await pb.collection('orders').update(orderIdStr, { status });

  logger.info(`[ORDERS] Order status updated - Order: ${orderIdStr}, Status: ${status}`);

  if (status === 'delivered') {
    const earnings = await pb.collection('seller_earnings').getFullList({
      filter: `order_id="${orderIdStr}"`,
    });

    if (earnings.length > 0) {
      await pb.collection('seller_earnings').update(earnings[0].id, { status: 'confirmed' });
      logger.info(`[ORDERS] Seller earnings confirmed - Order: ${orderIdStr}`);
    }
  }

  res.json({ success: true, message: `Order ${orderIdStr} status updated to ${status}` });
});

export default router;