import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { auth, requireAuth } from '../middleware/index.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Validate username format
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
};

// Activate Seller Account
router.post('/activate', requireAuth, async (req, res) => {
  const { username } = req.body;
  const userId = req.auth.id;

  logger.info(`[SELLER] Seller activation attempted for user: ${userId}`);
  logger.info(`[SELLER] Username provided: ${username}`);

  // Validate username format
  if (!validateUsername(username)) {
    return res.status(400).json({ 
      error: 'Invalid username format. Use 3-30 characters (alphanumeric, hyphens, underscores)' 
    });
  }

  // Ensure username is a string for filter
  const usernameStr = String(username).trim();

  // Check if username already exists
  const existingUser = await pb.collection('users').getFullList({
    filter: `seller_username = "${usernameStr}"`,
  });

  if (existingUser.length > 0) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  // Update user record with seller_username and is_seller=true
  const updatedUser = await pb.collection('users').update(userId, {
    seller_username: usernameStr,
    is_seller: true,
  });

  logger.info(`[SELLER] Seller account activated successfully for user: ${userId}`);
  logger.info(`[SELLER] Seller account activated for user ${userId} with username ${usernameStr}`);
  
  res.json({
    success: true,
    message: `Seller account activated with username: ${usernameStr}`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      seller_username: updatedUser.seller_username,
      is_seller: updatedUser.is_seller,
    },
  });
});

// Get Current User's Seller Products
router.get('/products', requireAuth, async (req, res) => {
  const userId = req.auth.id;
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 20;

  logger.info(`[SELLER] Fetching seller products for user: ${userId}`);

  // Ensure userId is a string for filter
  const userIdStr = String(userId);

  // Fetch products where seller_id = current user's id
  const result = await pb.collection('products').getList(page, perPage, {
    filter: `seller_id="${userIdStr}"`,
    sort: '-created',
  });

  logger.info(`[SELLER] Fetched ${result.items.length} seller products for user ${userId}`);
  
  res.json({
    items: result.items,
    total: result.totalItems,
    page: result.page,
    perPage: result.perPage,
  });
});

// Get Seller Profile
router.get('/profile', requireAuth, async (req, res) => {
  const userId = req.auth.id;

  logger.info(`[SELLER] Fetching seller profile for user: ${userId}`);

  // Get user details
  const user = await pb.collection('users').getOne(userId);

  if (!user.is_seller) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  // Ensure userId is a string for filter
  const userIdStr = String(userId);

  // Get seller statistics
  const orders = await pb.collection('orders').getFullList({
    filter: `seller_id="${userIdStr}"`,
  });

  const totalOrders = orders.length;
  const totalEarnings = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  logger.info(`[SELLER] Fetched seller profile for user ${userId}`);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    seller_username: user.seller_username,
    is_seller: user.is_seller,
    created_at: user.created,
    total_orders: totalOrders,
    total_earnings: totalEarnings,
  });
});

export default router;