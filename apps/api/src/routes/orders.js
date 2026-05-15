import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/index.js';
import {
  canTransitionOrderStatus,
  isOrderActive,
  isOrderCompleted,
  isOrderReviewReady,
  isOrderStatus,
  ORDER_STATUS_VALUES,
} from '../utils/orderStatus.js';
import { startPayoutWaitingPeriodForOrder } from '../utils/payoutWaitingPeriod.js';
import { syncSellerBalancesForOrder } from '../utils/sellerBalance.js';

const router = express.Router();

const SHIPPING_FEE = 4.99;
const SERVICE_FEE = 0.99;
const TRANSACTION_FEE_PERCENT = 0.07; // 7%

const PRODUCT_COLLECTION_BY_TYPE = {
  marketplace: 'products',
  shop: 'shop_products',
};

const clampPaginationNumber = (value, fallback, { min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const getProductImageUrl = (product) => {
  const images = Array.isArray(product?.images) ? product.images : product?.images ? [product.images] : [];
  const image = images[0] || product?.image || '';
  if (!image) return '';

  try {
    return pb.files.getUrl(product, image, { thumb: '300x300' });
  } catch {
    return '';
  }
};

const sanitizeProduct = (product) => {
  if (!product) return null;

  return {
    id: product.id,
    collectionId: product.collectionId,
    collectionName: product.collectionName,
    name: product.name || '',
    price: product.price || 0,
    image: product.image || '',
    images: Array.isArray(product.images) ? product.images : product.images ? [product.images] : [],
    condition: product.condition || '',
    product_type: product.product_type || '',
    fachbereich: product.fachbereich || [],
    seller_id: product.seller_id || '',
    seller_username: product.seller_username || '',
    image_url: getProductImageUrl(product),
  };
};

const sanitizeOrderForList = (order) => {
  const {
    dhl_label_pdf,
    dhl_tracking_raw,
    ...safeOrder
  } = order;

  return safeOrder;
};

const sanitizeReturnRequest = (returnRequest) => {
  if (!returnRequest) return null;

  return {
    id: returnRequest.id,
    order_id: returnRequest.order_id,
    status: returnRequest.status || 'Pending',
    reason: returnRequest.reason || '',
    details: returnRequest.details || '',
    admin_notes: returnRequest.admin_notes || '',
    product_type: returnRequest.product_type || '',
    return_type: returnRequest.return_type || '',
    claim_window_expires_at: returnRequest.claim_window_expires_at || '',
    tracking_number: returnRequest.dhl_tracking_number || '',
    has_label: !!returnRequest.dhl_label_pdf,
    label_generated_at: returnRequest.label_generated_at || '',
    refund_amount: returnRequest.refund_amount || 0,
    created: returnRequest.created,
    updated: returnRequest.updated,
  };
};

const fetchOrderProduct = async (order) => {
  if (!order?.product_id) return null;

  const productId = String(order.product_id);
  const preferredCollection = PRODUCT_COLLECTION_BY_TYPE[order.product_type] || 'products';
  const fallbackCollection = preferredCollection === 'products' ? 'shop_products' : 'products';

  try {
    return await pb.collection(preferredCollection).getOne(productId);
  } catch (preferredError) {
    logger.warn(`[ORDERS] Product lookup failed in ${preferredCollection} - Product: ${productId}, Error: ${preferredError.message}`);
  }

  try {
    return await pb.collection(fallbackCollection).getOne(productId);
  } catch (fallbackError) {
    logger.warn(`[ORDERS] Product lookup failed in ${fallbackCollection} - Product: ${productId}, Error: ${fallbackError.message}`);
    return null;
  }
};

const fetchLatestReturnRequest = async (orderId) => {
  const items = await pb.collection('returns').getFullList({
    filter: `order_id="${String(orderId).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
    sort: '-created',
  }).catch(() => []);

  return items[0] || null;
};

const sanitizeReview = (review) => {
  if (!review) return null;

  return {
    id: review.id,
    orderId: review.order_id || '',
    rating: Number(review.rating || 0),
    body: review.body || '',
    displayName: review.display_name || '',
    status: review.status || 'pending',
    isFeatured: review.is_featured === true,
    created: review.created,
    updated: review.updated,
  };
};

const fetchOrderReview = async (orderId, userId) => {
  const safeOrderId = String(orderId || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const safeUserId = String(userId || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return pb.collection('customer_reviews')
    .getFirstListItem(`order_id="${safeOrderId}" && user_id="${safeUserId}"`)
    .catch(() => null);
};

/**
 * GET /orders
 * List orders for the authenticated buyer with lightweight product data.
 */
router.get('/', requireAuth, async (req, res) => {
  const buyerId = String(req.auth.id);
  const page = clampPaginationNumber(req.query.page, 1, { min: 1, max: 1000 });
  const limit = clampPaginationNumber(req.query.limit, 100, { min: 1, max: 100 });

  logger.info(`[ORDERS] List buyer orders request - Buyer: ${buyerId}, Page: ${page}, Limit: ${limit}`);

  const result = await pb.collection('orders').getList(page, limit, {
    filter: `buyer_id="${buyerId}"`,
    sort: '-created',
  });

  const productCache = new Map();

  const items = await Promise.all(result.items.map(async (order) => {
    const productType = PRODUCT_COLLECTION_BY_TYPE[order.product_type] ? order.product_type : 'marketplace';
    const cacheKey = `${productType}:${order.product_id || ''}`;

    if (!productCache.has(cacheKey)) {
      productCache.set(cacheKey, fetchOrderProduct(order));
    }

    const product = await productCache.get(cacheKey);
    const trackingNumber = order.tracking_number || order.dhl_tracking_number || '';

    return sanitizeOrderForList({
      ...order,
      product: sanitizeProduct(product),
      has_label: !!(order.dhl_label_pdf || order.dhl_label_url),
      tracking_number: trackingNumber,
    });
  }));

  const summary = items.reduce((acc, order) => {
    acc.total += 1;
    if (isOrderActive(order.status)) acc.active += 1;
    if (isOrderCompleted(order.status)) acc.completed += 1;
    if (order.tracking_number || order.dhl_tracking_number) acc.tracked += 1;
    return acc;
  }, {
    total: 0,
    active: 0,
    completed: 0,
    tracked: 0,
  });

  res.json({
    items,
    summary,
    total: result.totalItems,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  });
});

/**
 * GET /orders/:orderId
 * Retrieve a single order with product and latest return request details.
 */
router.get('/:orderId', requireAuth, async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (
    order.buyer_id !== req.auth.id &&
    order.seller_id !== req.auth.id &&
    !req.auth.is_admin
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const product = await fetchOrderProduct(order);
  const latestReturnRequest = await fetchLatestReturnRequest(order.id);
  const review = order.buyer_id === req.auth.id || req.auth.is_admin
    ? await fetchOrderReview(order.id, order.buyer_id)
    : null;
  const trackingNumber = order.tracking_number || order.dhl_tracking_number || '';
  const normalizedStatus = String(order.status || '').toLowerCase();
  const canReview = order.buyer_id === req.auth.id && isOrderReviewReady(normalizedStatus) && !review;

  res.json({
    ...order,
    product: sanitizeProduct(product),
    has_label: !!(order.dhl_label_pdf || order.dhl_label_url),
    tracking_number: trackingNumber,
    return_request: sanitizeReturnRequest(latestReturnRequest),
    review: sanitizeReview(review),
    can_review: canReview,
  });
});

/**
 * GET /orders/:orderId/label-pdf
 * Download the shipping label for an order the authenticated user can access.
 */
router.get('/:orderId/label-pdf', requireAuth, async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (
    order.buyer_id !== req.auth.id &&
    order.seller_id !== req.auth.id &&
    !req.auth.is_admin
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (order.dhl_label_pdf) {
    const labelBuffer = Buffer.from(order.dhl_label_pdf, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DHL_Label_${order.order_number || order.id}.pdf"`,
    );
    return res.send(labelBuffer);
  }

  if (order.dhl_label_url) {
    return res.json({
      label_url: order.dhl_label_url,
    });
  }

  return res.status(404).json({ error: 'No label available for this order' });
});

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

  if (!status || !isOrderStatus(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${ORDER_STATUS_VALUES.join(', ')}`,
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

  if (!req.auth.is_admin && !['shipped', 'dhl_delivered', 'delivered', 'cancelled'].includes(status)) {
    return res.status(403).json({
      error: 'Only admins can set this order status',
      requestedStatus: status,
    });
  }

  if (!canTransitionOrderStatus(order.status, status)) {
    return res.status(400).json({
      error: `Invalid order status transition from ${order.status || 'pending'} to ${status}`,
      currentStatus: order.status || 'pending',
      requestedStatus: status,
    });
  }

  let updatedOrder = await pb.collection('orders').update(orderIdStr, { status });

  logger.info(`[ORDERS] Order status updated - Order: ${orderIdStr}, Status: ${status}`);

  if (status === 'paid_out') {
    const earnings = await pb.collection('seller_earnings').getFullList({
      filter: `order_id="${orderIdStr}"`,
    });

    if (earnings.length > 0) {
      await Promise.all(earnings.map((earning) => pb.collection('seller_earnings').update(earning.id, {
        status: 'paid_out',
        released_at: new Date().toISOString(),
        payout_release_blocked_reason: '',
      })));
      await syncSellerBalancesForOrder(orderIdStr);
      logger.info(`[ORDERS] Seller earnings confirmed - Order: ${orderIdStr}`);
    }
  }

  if (['cancelled', 'refunded'].includes(status)) {
    const earnings = await pb.collection('seller_earnings').getFullList({
      filter: `order_id="${orderIdStr}"`,
    }).catch(() => []);

    await Promise.all(earnings
      .filter((earning) => earning.status !== 'paid_out')
      .map((earning) => pb.collection('seller_earnings').update(earning.id, {
        status: 'blocked',
        payout_release_blocked_reason: status,
      })));
    await syncSellerBalancesForOrder(orderIdStr);
  }

  if (['dhl_delivered', 'delivered'].includes(status)) {
    updatedOrder = await startPayoutWaitingPeriodForOrder({
      order: updatedOrder,
      deliveredAt: new Date().toISOString(),
      source: req.auth.is_admin ? 'admin_order_status_route' : 'seller_order_status_route',
      actorId: req.auth.id,
    });
    logger.info(`[ORDERS] Payout waiting period started - Order: ${orderIdStr}, Status: ${updatedOrder.status}`);
  }

  res.json({ success: true, message: `Order ${orderIdStr} status updated to ${updatedOrder.status}`, order: updatedOrder });
});

export default router;
