import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

const EMAIL_SENDER = 'info@zahniboerse.com';

// Send Order Confirmation Email
router.post('/send-order-confirmation', async (req, res) => {
  const { orderId, buyerEmail } = req.body;

  // Ensure values are strings
  const orderIdStr = String(orderId);
  const buyerEmailStr = String(buyerEmail).trim();

  if (!orderIdStr || !buyerEmailStr) {
    return res.status(400).json({ error: 'Missing required fields: orderId, buyerEmail' });
  }

  // Fetch order details
  const order = await pb.collection('orders').getOne(orderIdStr);

  if (!order) {
    return res.status(404).json({ error: `Order ${orderIdStr} not found` });
  }

  // Fetch product details
  const product = await pb.collection('products').getOne(order.product_id);

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: buyerEmailStr,
    type: 'order_confirmation',
    sender: EMAIL_SENDER,
    subject: `Order Confirmation - Order #${orderIdStr}`,
    body: `Your order for "${product.name}" has been confirmed. Order ID: ${orderIdStr}. Total: €${order.total_amount?.toFixed(2) || '0.00'}`,
    metadata: {
      order_id: orderIdStr,
      product_name: product.name,
      total_amount: order.total_amount,
    },
    status: 'pending',
  });

  logger.info(`Order confirmation email queued for ${buyerEmailStr}`);
  res.json({
    success: true,
    message: `Order confirmation email sent to ${buyerEmailStr}`,
  });
});

// Send Sales Notification Email
router.post('/send-sales-notification', async (req, res) => {
  const { orderId, sellerEmail } = req.body;

  // Ensure values are strings
  const orderIdStr = String(orderId);
  const sellerEmailStr = String(sellerEmail).trim();

  if (!orderIdStr || !sellerEmailStr) {
    return res.status(400).json({ error: 'Missing required fields: orderId, sellerEmail' });
  }

  // Fetch order details
  const order = await pb.collection('orders').getOne(orderIdStr);

  if (!order) {
    return res.status(404).json({ error: `Order ${orderIdStr} not found` });
  }

  // Fetch product details
  const product = await pb.collection('products').getOne(order.product_id);

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'sales_confirmation',
    sender: EMAIL_SENDER,
    subject: `Sale Confirmed - Order #${orderIdStr}`,
    body: `Your product "${product.name}" has been sold. Order ID: ${orderIdStr}. Total: €${order.total_amount?.toFixed(2) || '0.00'}`,
    metadata: {
      order_id: orderIdStr,
      product_name: product.name,
      total_amount: order.total_amount,
    },
    status: 'pending',
  });

  logger.info(`Sales notification email queued for ${sellerEmailStr}`);
  res.json({
    success: true,
    message: `Sales notification email sent to ${sellerEmailStr}`,
  });
});

// Send Verification Notification Email
router.post('/send-verification-notification', async (req, res) => {
  const { productId, sellerEmail, status } = req.body;

  // Ensure values are strings
  const productIdStr = String(productId);
  const sellerEmailStr = String(sellerEmail).trim();
  const statusStr = String(status).trim();

  if (!productIdStr || !sellerEmailStr || !statusStr) {
    return res.status(400).json({ error: 'Missing required fields: productId, sellerEmail, status' });
  }

  // Fetch product details
  const product = await pb.collection('products').getOne(productIdStr);

  if (!product) {
    return res.status(404).json({ error: `Product ${productIdStr} not found` });
  }

  // Create email record for PocketBase hooks to process
  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type: 'verification_notification',
    sender: EMAIL_SENDER,
    subject: `Product Verification Status - ${product.name}`,
    body: `Your product "${product.name}" has been ${statusStr}.`,
    metadata: {
      product_id: productIdStr,
      product_name: product.name,
      verification_status: statusStr,
    },
    status: 'pending',
  });

  logger.info(`Verification notification email queued for ${sellerEmailStr}`);
  res.json({
    success: true,
    message: `Verification notification email sent to ${sellerEmailStr}`,
  });
});

export default router;