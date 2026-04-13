import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { auth, requireAuth, admin } from '../middleware/index.js';

const router = express.Router();

// Apply auth, requireAuth and admin middleware to all routes
router.use(auth);
router.use(requireAuth);
router.use(admin);

// Get Shop Orders
router.get('/shop', async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  let filter = 'product_type="shop"';

  // Filter by status if provided
  if (status) {
    // Ensure status is a string
    const statusStr = String(status).trim();
    filter += ` && status="${statusStr}"`;
  }

  const orders = await pb.collection('orders').getList(pageNum, limitNum, {
    filter,
    sort: '-created_at',
    expand: 'buyer_id,product_id',
  });

  // Format response with required columns
  const formattedOrders = orders.items.map((order) => ({
    order_id: order.id,
    buyer: order.expand?.buyer_id?.email || 'Unknown',
    product: order.expand?.product_id?.name || 'Unknown',
    total: order.total_amount,
    status: order.status,
    date: order.created_at,
  }));

  logger.info(`Fetched ${orders.items.length} shop orders by admin ${req.auth.id}`);
  res.json({
    items: formattedOrders,
    total: orders.totalItems,
    page: pageNum,
    limit: limitNum,
  });
});

// Get Marketplace Orders
router.get('/marketplace', async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  let filter = 'product_type="marketplace"';

  // Filter by status if provided
  if (status) {
    // Ensure status is a string
    const statusStr = String(status).trim();
    filter += ` && status="${statusStr}"`;
  }

  const orders = await pb.collection('orders').getList(pageNum, limitNum, {
    filter,
    sort: '-created_at',
    expand: 'buyer_id,seller_id,product_id',
  });

  // Format response with required columns
  const formattedOrders = orders.items.map((order) => ({
    order_id: order.id,
    buyer: order.expand?.buyer_id?.email || 'Unknown',
    seller: order.expand?.seller_id?.email || 'Unknown',
    product: order.expand?.product_id?.name || 'Unknown',
    total: order.total_amount,
    status: order.status,
    date: order.created_at,
  }));

  logger.info(`Fetched ${orders.items.length} marketplace orders by admin ${req.auth.id}`);
  res.json({
    items: formattedOrders,
    total: orders.totalItems,
    page: pageNum,
    limit: limitNum,
  });
});

export default router;