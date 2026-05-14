import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { requireAuth, admin } from '../middleware/index.js';

const router = express.Router();

const REVIEWABLE_ORDER_STATUSES = new Set(['delivered', 'completed']);
const PRODUCT_COLLECTION_BY_TYPE = {
  marketplace: 'products',
  shop: 'shop_products',
};

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const clampNumber = (value, fallback, { min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const getInitials = (displayName) => {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
};

const normalizeDisplayName = (user, fallback = '') => {
  const source = String(
    user?.name ||
    user?.username ||
    fallback ||
    user?.email ||
    '',
  ).trim();

  if (!source) return 'Verified buyer';
  if (source.includes('@')) return source.split('@')[0];
  return source.slice(0, 80);
};

const serializeReview = (review, { includePrivate = false } = {}) => {
  if (!review) return null;

  const safeReview = {
    id: review.id,
    rating: Number(review.rating || 0),
    body: review.body || '',
    displayName: review.display_name || '',
    initials: getInitials(review.display_name),
    verifiedBuyer: true,
    productName: review.product_name || '',
    productType: review.product_type || '',
    isFeatured: review.is_featured === true,
    created: review.created,
    updated: review.updated,
  };

  if (includePrivate) {
    safeReview.orderId = review.order_id || '';
    safeReview.productId = review.product_id || '';
    safeReview.userId = review.user_id || '';
    safeReview.status = review.status || 'pending';
    safeReview.adminNotes = review.admin_notes || '';
  }

  return safeReview;
};

const fetchOrderProduct = async (order) => {
  if (!order?.product_id) return null;

  const productType = PRODUCT_COLLECTION_BY_TYPE[order.product_type] ? order.product_type : 'marketplace';
  const preferredCollection = PRODUCT_COLLECTION_BY_TYPE[productType];
  const fallbackCollection = preferredCollection === 'products' ? 'shop_products' : 'products';

  try {
    return await pb.collection(preferredCollection).getOne(String(order.product_id));
  } catch (preferredError) {
    logger.warn(`[REVIEWS] Product lookup failed in ${preferredCollection} for ${order.product_id}: ${preferredError.message}`);
  }

  try {
    return await pb.collection(fallbackCollection).getOne(String(order.product_id));
  } catch (fallbackError) {
    logger.warn(`[REVIEWS] Product lookup failed in ${fallbackCollection} for ${order.product_id}: ${fallbackError.message}`);
    return null;
  }
};

const findReviewForOrder = async (orderId, userId) => {
  const filter = `order_id="${escapeFilterValue(orderId)}" && user_id="${escapeFilterValue(userId)}"`;

  return pb.collection('customer_reviews').getFirstListItem(filter).catch(() => null);
};

const buildReviewSummary = (reviews) => {
  const count = reviews.length;
  const ratingTotal = reviews.reduce((total, review) => total + Number(review.rating || 0), 0);

  return {
    count,
    averageRating: count > 0 ? Number((ratingTotal / count).toFixed(1)) : 0,
  };
};

router.get('/', async (req, res) => {
  const limit = clampNumber(req.query.limit, 6, { min: 1, max: 12 });
  const page = clampNumber(req.query.page, 1, { min: 1, max: 1000 });
  const featuredOnly = String(req.query.featured ?? 'true') !== 'false';
  const filters = ['status="approved"'];

  if (featuredOnly) {
    filters.push('is_featured=true');
  }

  const result = await pb.collection('customer_reviews').getList(page, limit, {
    filter: filters.join(' && '),
    sort: featuredOnly ? '-is_featured,-created' : '-created',
  }).catch((error) => {
    logger.warn(`[REVIEWS] Public review list failed: ${error.message}`);
    return {
      items: [],
      totalItems: 0,
      page,
      perPage: limit,
      totalPages: 0,
    };
  });

  res.json({
    items: result.items.map((review) => serializeReview(review)),
    total: result.totalItems,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  });
});

router.get('/product/:productId', async (req, res) => {
  const productId = String(req.params.productId || '').trim();
  const productType = PRODUCT_COLLECTION_BY_TYPE[req.query.type] ? String(req.query.type) : '';
  const limit = clampNumber(req.query.limit, 10, { min: 1, max: 50 });
  const page = clampNumber(req.query.page, 1, { min: 1, max: 1000 });

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const filters = [
    'status="approved"',
    `product_id="${escapeFilterValue(productId)}"`,
  ];

  if (productType) {
    filters.push(`product_type="${escapeFilterValue(productType)}"`);
  }

  const result = await pb.collection('customer_reviews').getList(page, limit, {
    filter: filters.join(' && '),
    sort: '-created',
  }).catch((error) => {
    logger.warn(`[REVIEWS] Product review list failed - Product: ${productId}, Error: ${error.message}`);
    return {
      items: [],
      totalItems: 0,
      page,
      perPage: limit,
      totalPages: 0,
    };
  });

  res.json({
    items: result.items.map((review) => serializeReview(review)),
    summary: buildReviewSummary(result.items),
    total: result.totalItems,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  });
});

router.get('/product/:productId/eligibility', requireAuth, async (req, res) => {
  const productId = String(req.params.productId || '').trim();
  const productType = PRODUCT_COLLECTION_BY_TYPE[req.query.type] ? String(req.query.type) : 'marketplace';

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const orders = await pb.collection('orders').getFullList({
    filter: [
      `buyer_id="${escapeFilterValue(req.auth.id)}"`,
      `product_id="${escapeFilterValue(productId)}"`,
      `product_type="${escapeFilterValue(productType)}"`,
      '(status="delivered" || status="completed")',
    ].join(' && '),
    sort: '-created',
  }).catch((error) => {
    logger.warn(`[REVIEWS] Product review eligibility lookup failed - Product: ${productId}, User: ${req.auth.id}, Error: ${error.message}`);
    return [];
  });

  for (const order of orders) {
    const existingReview = await findReviewForOrder(order.id, req.auth.id);

    if (!existingReview) {
      return res.json({
        canReview: true,
        orderId: order.id,
        orderNumber: order.order_number || '',
        review: null,
      });
    }
  }

  for (const order of orders) {
    const existingReview = await findReviewForOrder(order.id, req.auth.id);

    if (existingReview) {
      return res.json({
        canReview: false,
        orderId: order.id,
        orderNumber: order.order_number || '',
        review: serializeReview(existingReview, { includePrivate: true }),
      });
    }
  }

  return res.json({
    canReview: false,
    orderId: '',
    orderNumber: '',
    review: null,
  });
});

router.get('/my', requireAuth, async (req, res) => {
  const reviews = await pb.collection('customer_reviews').getFullList({
    filter: `user_id="${escapeFilterValue(req.auth.id)}"`,
    sort: '-created',
  }).catch(() => []);

  res.json({
    items: reviews.map((review) => serializeReview(review, { includePrivate: true })),
  });
});

router.post('/', requireAuth, async (req, res) => {
  const orderId = String(req.body?.orderId || '').trim();
  const rating = Number.parseInt(req.body?.rating, 10);
  const body = String(req.body?.body || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  if (body.length < 10 || body.length > 1200) {
    return res.status(400).json({ error: 'body must be between 10 and 1200 characters' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.buyer_id !== req.auth.id) {
    return res.status(403).json({ error: 'Only the buyer can review this order' });
  }

  if (!REVIEWABLE_ORDER_STATUSES.has(String(order.status || '').toLowerCase())) {
    return res.status(409).json({ error: 'Only delivered or completed orders can be reviewed' });
  }

  const existingReview = await findReviewForOrder(order.id, req.auth.id);
  if (existingReview) {
    return res.status(409).json({
      error: 'This order has already been reviewed',
      review: serializeReview(existingReview, { includePrivate: true }),
    });
  }

  const [product, user] = await Promise.all([
    fetchOrderProduct(order),
    pb.collection('users').getOne(req.auth.id).catch(() => null),
  ]);

  const displayName = normalizeDisplayName(user, req.auth.email);
  const productType = PRODUCT_COLLECTION_BY_TYPE[order.product_type] ? order.product_type : 'marketplace';

  const review = await pb.collection('customer_reviews').create({
    user_id: req.auth.id,
    order_id: order.id,
    product_id: order.product_id || '',
    product_name: product?.name || '',
    product_type: productType,
    rating,
    body,
    display_name: displayName,
    status: 'approved',
    is_featured: true,
    admin_notes: '',
  });

  logger.info(`[REVIEWS] Customer review created - Review: ${review.id}, Order: ${order.id}, User: ${req.auth.id}`);

  res.status(201).json({
    review: serializeReview(review, { includePrivate: true }),
  });
});

router.get('/admin', requireAuth, admin, async (req, res) => {
  const status = String(req.query.status || '').trim();
  const page = clampNumber(req.query.page, 1, { min: 1, max: 1000 });
  const limit = clampNumber(req.query.limit, 50, { min: 1, max: 100 });
  const filter = ['pending', 'approved', 'rejected'].includes(status)
    ? `status="${escapeFilterValue(status)}"`
    : '';

  const result = await pb.collection('customer_reviews').getList(page, limit, {
    filter,
    sort: '-created',
  });

  res.json({
    items: result.items.map((review) => serializeReview(review, { includePrivate: true })),
    total: result.totalItems,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  });
});

router.patch('/admin/:reviewId', requireAuth, admin, async (req, res) => {
  const reviewId = String(req.params.reviewId || '').trim();
  const status = String(req.body?.status || '').trim();
  const updateData = {};

  if (!reviewId) {
    return res.status(400).json({ error: 'reviewId is required' });
  }

  if (status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }
    updateData.status = status;
  }

  if (typeof req.body?.isFeatured === 'boolean') {
    updateData.is_featured = req.body.isFeatured;
  }

  if (typeof req.body?.adminNotes === 'string') {
    updateData.admin_notes = req.body.adminNotes.trim().slice(0, 1200);
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No review updates provided' });
  }

  const review = await pb.collection('customer_reviews').update(reviewId, updateData);

  logger.info(`[REVIEWS] Admin updated review - Review: ${review.id}, Admin: ${req.auth.id}`);

  res.json({
    review: serializeReview(review, { includePrivate: true }),
  });
});

export default router;
