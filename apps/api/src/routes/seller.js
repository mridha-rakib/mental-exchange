import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { auth, requireAuth } from '../middleware/index.js';
import { getOrSyncSellerBalance, syncSellerBalance } from '../utils/sellerBalance.js';
import {
  cancelSellerPayoutRequest,
  createSellerPayoutRequest,
  getSellerPayoutRequestSummary,
  listSellerPayoutRequests,
} from '../utils/sellerPayoutRequests.js';
import {
  createSellerStripeLoginLink,
  createSellerStripeOnboardingLink,
  getSellerStripeConnectStatus,
} from '../utils/stripeConnect.js';

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
  await syncSellerBalance(userId);

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

router.get('/balance', requireAuth, async (req, res) => {
  const userId = req.auth.id;
  const user = await pb.collection('users').getOne(userId);

  if (user.is_seller !== true) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  const balance = await syncSellerBalance(userId) || await getOrSyncSellerBalance(userId);

  res.json({
    id: balance?.id || '',
    seller_id: userId,
    currency: balance?.currency || 'EUR',
    pending_amount: Number(balance?.pending_amount) || 0,
    waiting_amount: Number(balance?.waiting_amount) || 0,
    available_amount: Number(balance?.available_amount) || 0,
    blocked_amount: Number(balance?.blocked_amount) || 0,
    paid_out_amount: Number(balance?.paid_out_amount) || 0,
    lifetime_gross_amount: Number(balance?.lifetime_gross_amount) || 0,
    lifetime_fee_amount: Number(balance?.lifetime_fee_amount) || 0,
    lifetime_net_amount: Number(balance?.lifetime_net_amount) || 0,
    pending_count: Number(balance?.pending_count) || 0,
    waiting_count: Number(balance?.waiting_count) || 0,
    available_count: Number(balance?.available_count) || 0,
    blocked_count: Number(balance?.blocked_count) || 0,
    paid_out_count: Number(balance?.paid_out_count) || 0,
    order_count: Number(balance?.order_count) || 0,
    last_synced_at: balance?.last_synced_at || '',
  });
});

router.get('/payout-requests', requireAuth, async (req, res) => {
  const userId = req.auth.id;
  const user = await pb.collection('users').getOne(userId);

  if (user.is_seller !== true) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  const [summary, requests] = await Promise.all([
    getSellerPayoutRequestSummary(userId),
    listSellerPayoutRequests(userId, { limit: req.query?.limit || 50 }),
  ]);

  res.json({
    items: requests,
    summary: {
      open_request_amount: summary.open_request_amount,
      requestable_amount: summary.requestable_amount,
      available_amount: Number(summary.balance?.available_amount) || 0,
      currency: summary.balance?.currency || 'EUR',
    },
  });
});

router.get('/stripe-connect/status', requireAuth, async (req, res) => {
  const user = await pb.collection('users').getOne(req.auth.id);

  if (user.is_seller !== true) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  try {
    const status = await getSellerStripeConnectStatus(user);
    res.json(status);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post('/stripe-connect/onboarding-link', requireAuth, async (req, res) => {
  const user = await pb.collection('users').getOne(req.auth.id);

  if (user.is_seller !== true) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  try {
    const result = await createSellerStripeOnboardingLink(user);
    logger.info(`[SELLER] Stripe Connect onboarding link created for seller ${req.auth.id}`);
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post('/stripe-connect/login-link', requireAuth, async (req, res) => {
  const user = await pb.collection('users').getOne(req.auth.id);

  if (user.is_seller !== true) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  try {
    const result = await createSellerStripeLoginLink(user);
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post('/payout-requests', requireAuth, async (req, res) => {
  const userId = req.auth.id;
  const user = await pb.collection('users').getOne(userId);

  if (user.is_seller !== true) {
    return res.status(403).json({ error: 'User is not a seller' });
  }

  try {
    const connectStatus = await getSellerStripeConnectStatus(user);
    if (!connectStatus.payouts_enabled) {
      return res.status(400).json({
        error: 'Stripe Connect onboarding must be completed before requesting payouts',
        connectStatus,
      });
    }

    const request = await createSellerPayoutRequest({
      sellerId: userId,
      amount: req.body?.amount,
      sellerNotes: req.body?.seller_notes || req.body?.notes || '',
    });
    const summary = await getSellerPayoutRequestSummary(userId);

    logger.info(`[SELLER] Payout request created - Seller: ${userId}, Request: ${request.id}, Amount: ${request.amount}`);
    res.status(201).json({
      success: true,
      request,
      summary: {
        open_request_amount: summary.open_request_amount,
        requestable_amount: summary.requestable_amount,
        available_amount: Number(summary.balance?.available_amount) || 0,
        currency: summary.balance?.currency || 'EUR',
      },
    });
  } catch (error) {
    res.status(error.status || 400).json({
      error: error.message,
      availableAmount: error.availableAmount,
      openRequestAmount: error.openRequestAmount,
      requestableAmount: error.requestableAmount,
    });
  }
});

router.post('/payout-requests/:id/cancel', requireAuth, async (req, res) => {
  try {
    const request = await cancelSellerPayoutRequest({
      sellerId: req.auth.id,
      requestId: req.params.id,
    });
    const summary = await getSellerPayoutRequestSummary(req.auth.id);

    res.json({
      success: true,
      request,
      summary: {
        open_request_amount: summary.open_request_amount,
        requestable_amount: summary.requestable_amount,
        available_amount: Number(summary.balance?.available_amount) || 0,
        currency: summary.balance?.currency || 'EUR',
      },
    });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
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
