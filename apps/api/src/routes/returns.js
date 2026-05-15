import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { generateLabel } from '../utils/dhlService.js';
import {
  beginDhlLabelJob,
  completeDhlLabelJob,
  failDhlLabelJob,
} from '../utils/dhlLabelJobs.js';
import { requireAuth } from '../middleware/index.js';
import { normalizeCountryCode } from '../utils/countryCodes.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const TWO_DAY_CLAIM_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const PRODUCT_COLLECTION_BY_TYPE = {
  marketplace: 'products',
  shop: 'shop_products',
};

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const parseAddress = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const sanitizeProduct = (product) => {
  if (!product) return null;

  return {
    id: product.id,
    collectionName: product.collectionName,
    name: product.name || '',
    price: product.price || 0,
    image: product.image || '',
    images: Array.isArray(product.images) ? product.images : product.images ? [product.images] : [],
    product_type: product.product_type || '',
    brand: product.brand || '',
    location: product.location || '',
    shipping_type: product.shipping_type || 'dhl_parcel',
    seller_id: product.seller_id || '',
    seller_username: product.seller_username || '',
  };
};

const sanitizeReturn = (returnRequest) => {
  if (!returnRequest) return null;

  return {
    id: returnRequest.id,
    order_id: returnRequest.order_id,
    product_id: returnRequest.product_id,
    seller_id: returnRequest.seller_id,
    buyer_id: returnRequest.buyer_id,
    reason: returnRequest.reason || '',
    details: returnRequest.details || '',
    status: returnRequest.status || 'Pending',
    refund_amount: returnRequest.refund_amount || 0,
    product_type: returnRequest.product_type || '',
    return_type: returnRequest.return_type || '',
    admin_notes: returnRequest.admin_notes || '',
    claim_window_expires_at: returnRequest.claim_window_expires_at || '',
    label_generated_at: returnRequest.label_generated_at || '',
    tracking_number: returnRequest.dhl_tracking_number || '',
    has_label: !!returnRequest.dhl_label_pdf,
    stripe_refund_id: returnRequest.stripe_refund_id || '',
    refund_status: returnRequest.refund_status || '',
    refund_processed_at: returnRequest.refund_processed_at || '',
    refund_failure: returnRequest.refund_failure || '',
    created: returnRequest.created,
    updated: returnRequest.updated,
  };
};

const fetchOrderProduct = async (order) => {
  if (!order?.product_id) return null;

  const productId = String(order.product_id);
  const productType = order.product_type === 'shop' ? 'shop' : 'marketplace';
  const preferredCollection = PRODUCT_COLLECTION_BY_TYPE[productType];
  const fallbackCollection = preferredCollection === 'products' ? 'shop_products' : 'products';

  try {
    return await pb.collection(preferredCollection).getOne(productId);
  } catch (preferredError) {
    logger.warn(`[RETURNS] Product lookup failed in ${preferredCollection} - Product: ${productId}, Error: ${preferredError.message}`);
  }

  try {
    return await pb.collection(fallbackCollection).getOne(productId);
  } catch (fallbackError) {
    logger.warn(`[RETURNS] Product lookup failed in ${fallbackCollection} - Product: ${productId}, Error: ${fallbackError.message}`);
    return null;
  }
};

const buildParcelFromProduct = (product) => ({
  weight_g: product?.weight_g || product?.weight_grams || product?.weight || null,
  length_mm: product?.length_mm || product?.length || null,
  width_mm: product?.width_mm || product?.width || null,
  height_mm: product?.height_mm || product?.height || null,
});

const buildReturnLabelIdempotencyKey = (returnRequest, order) => [
  'return',
  returnRequest?.id || '',
  order?.id || '',
  order?.payment_intent_id || '',
  order?.product_id || '',
].filter(Boolean).join(':');

const toStripeAmount = (amount) => Math.round(Number(amount || 0) * 100);

const buildReturnRefundIdempotencyKey = (returnRequest, order, amountCents) => [
  'return-refund',
  returnRequest?.id || '',
  order?.id || '',
  order?.payment_intent_id || '',
  amountCents,
].filter((part) => part !== '').join(':');

const ensureStripeRefundForReturn = async ({ returnRequest, order, refundAmount, requestedBy }) => {
  const amountCents = toStripeAmount(refundAmount);
  if (amountCents <= 0) {
    return {
      refund_amount: 0,
      refund_status: '',
      refund_failure: '',
    };
  }

  const paymentIntentId = String(order?.payment_intent_id || '').trim();
  if (!paymentIntentId) {
    const error = new Error('Cannot process refund because the order has no Stripe payment intent');
    error.status = 400;
    throw error;
  }

  const existingRefundId = String(returnRequest?.stripe_refund_id || '').trim();
  if (existingRefundId) {
    const existingRefund = await stripe.refunds.retrieve(existingRefundId).catch((error) => {
      logger.warn(`[RETURNS] Could not retrieve existing Stripe refund ${existingRefundId}: ${error.message}`);
      return null;
    });

    if (existingRefund && existingRefund.status !== 'failed') {
      return {
        refund_amount: Number(existingRefund.amount || amountCents) / 100,
        stripe_refund_id: existingRefund.id,
        refund_status: existingRefund.status || 'succeeded',
        refund_processed_at: existingRefund.created ? new Date(existingRefund.created * 1000).toISOString() : new Date().toISOString(),
        refund_failure: '',
      };
    }
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paidAmountCents = Number(paymentIntent.amount_received || paymentIntent.amount || 0);
  const refundList = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
  const alreadyRefundedCents = (refundList.data || [])
    .filter((refund) => !['failed', 'canceled'].includes(String(refund.status || '')))
    .reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
  const remainingRefundableCents = Math.max(0, paidAmountCents - alreadyRefundedCents);

  if (amountCents > remainingRefundableCents) {
    const error = new Error(`Refund amount exceeds the remaining refundable payment amount (€${(remainingRefundableCents / 100).toFixed(2)})`);
    error.status = 400;
    throw error;
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason: 'requested_by_customer',
    metadata: {
      return_id: returnRequest.id,
      order_id: order.id,
      requested_by: requestedBy || '',
      product_type: returnRequest.product_type || order.product_type || '',
    },
  }, {
    idempotencyKey: buildReturnRefundIdempotencyKey(returnRequest, order, amountCents),
  });

  logger.info(`[RETURNS] Stripe refund created - Return: ${returnRequest.id}, Refund: ${refund.id}, Amount: ${amountCents}`);

  return {
    refund_amount: Number(refund.amount || amountCents) / 100,
    stripe_refund_id: refund.id,
    refund_status: refund.status || 'pending',
    refund_processed_at: refund.created ? new Date(refund.created * 1000).toISOString() : new Date().toISOString(),
    refund_failure: '',
  };
};

const getDhlErrorType = (error) => error?.dhl?.type || error?.details?.job?.failure_type || error?.name || 'unknown';

const assertAdmin = (req) => {
  if (!req.auth?.is_admin) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
};

const assertReturnOwner = (req, returnRequest) => {
  if (req.auth?.is_admin) return;
  if (String(returnRequest.buyer_id || '') !== String(req.auth?.id || '')) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
};

const normalizeAddressForDhl = (address, fallbackName = '') => ({
  name: String(
    address?.name ||
    address?.fullName ||
    address?.name1 ||
    address?.full_name ||
    fallbackName ||
    ''
  ).trim(),
  street: String(
    address?.street ||
    address?.street_address ||
    address?.addressStreet ||
    address?.address ||
    ''
  ).trim(),
  postal_code: String(
    address?.postalCode ||
    address?.postal_code ||
    address?.zip ||
    ''
  ).trim(),
  city: String(address?.city || '').trim(),
  country: normalizeCountryCode(address?.country || 'DE'),
});

const getMissingAddressFields = (prefix, address) => {
  const missing = [];
  if (!address.name) missing.push(`${prefix}.name`);
  if (!address.street) missing.push(`${prefix}.street`);
  if (!address.postal_code) missing.push(`${prefix}.postal_code`);
  if (!address.city) missing.push(`${prefix}.city`);
  if (!address.country) missing.push(`${prefix}.country`);
  return missing;
};

const getWarehouseAddress = () => ({
  name: String(process.env.WAREHOUSE_NAME || '').trim(),
  street: String(process.env.WAREHOUSE_ADDRESS_STREET || '').trim(),
  postal_code: String(process.env.WAREHOUSE_ADDRESS_ZIP || '').trim(),
  city: String(process.env.WAREHOUSE_ADDRESS_CITY || '').trim(),
  country: normalizeCountryCode(process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE'),
});

const getSellerReturnAddress = async (sellerId) => {
  const shippingInfo = await pb.collection('shipping_info')
    .getFirstListItem(`user_id="${escapeFilterValue(sellerId)}"`)
    .catch(() => null);

  const seller = await pb.collection('users').getOne(sellerId).catch(() => null);

  return normalizeAddressForDhl(shippingInfo, seller?.name || seller?.email || '');
};

const getReturnLabelContext = async (returnRequest, order) => {
  const buyer = await pb.collection('users').getOne(order.buyer_id).catch(() => null);
  const shipper = normalizeAddressForDhl(parseAddress(order.shipping_address), buyer?.name || buyer?.email || '');

  const recipient = order.product_type === 'shop'
    ? getWarehouseAddress()
    : await getSellerReturnAddress(order.seller_id);

  const missingFields = [
    ...getMissingAddressFields('shipper', shipper),
    ...getMissingAddressFields('recipient', recipient),
  ];

  if (missingFields.length > 0) {
    throw new Error(`Missing return label address fields: ${missingFields.join(', ')}`);
  }

  return {
    shipper,
    recipient,
  };
};

const getLatestReturnForOrder = async (orderId) => {
  const records = await pb.collection('returns').getFullList({
    filter: `order_id="${escapeFilterValue(orderId)}"`,
    sort: '-created',
  }).catch(() => []);

  return records[0] || null;
};

router.get('/my', requireAuth, async (req, res) => {
  const buyerId = String(req.auth.id);
  const orderId = String(req.query.orderId || '').trim();
  const orderFilter = orderId ? ` && order_id="${escapeFilterValue(orderId)}"` : '';

  const records = await pb.collection('returns').getFullList({
    filter: `buyer_id="${escapeFilterValue(buyerId)}"${orderFilter}`,
    sort: '-created',
  }).catch(() => []);

  const productCache = new Map();

  const items = await Promise.all(records.map(async (record) => {
    const order = record.order_id
      ? await pb.collection('orders').getOne(record.order_id).catch(() => null)
      : null;

    const cacheKey = `${record.product_type || order?.product_type || 'marketplace'}:${record.product_id || ''}`;
    if (!productCache.has(cacheKey)) {
      productCache.set(cacheKey, order ? fetchOrderProduct(order) : Promise.resolve(null));
    }

    const product = await productCache.get(cacheKey);

    return {
      ...sanitizeReturn(record),
      order_number: order?.order_number || '',
      order_status: order?.status || '',
      product: sanitizeProduct(product),
    };
  }));

  res.json({ items });
});

router.get('/shop-lookup/:lookup', requireAuth, async (req, res) => {
  const lookup = String(req.params.lookup || '').trim();
  const buyerId = String(req.auth.id);

  if (!lookup) {
    return res.status(400).json({ error: 'lookup is required' });
  }

  const lookupFilter = escapeFilterValue(lookup);
  const baseOrder = await pb.collection('orders').getFirstListItem(
    `buyer_id="${escapeFilterValue(buyerId)}" && product_type="shop" && (id="${lookupFilter}" || order_number="${lookupFilter}" || payment_intent_id="${lookupFilter}")`
  ).catch(() => null);

  if (!baseOrder) {
    return res.status(404).json({ error: 'No matching shop order found for this account' });
  }

  const groupOrders = baseOrder.payment_intent_id
    ? await pb.collection('orders').getFullList({
      filter: `buyer_id="${escapeFilterValue(buyerId)}" && product_type="shop" && payment_intent_id="${escapeFilterValue(baseOrder.payment_intent_id)}"`,
      sort: 'created',
    }).catch(() => [baseOrder])
    : [baseOrder];

  const items = await Promise.all(groupOrders.map(async (order) => {
    const product = await fetchOrderProduct(order);
    const latestReturn = await getLatestReturnForOrder(order.id);

    return {
      id: order.id,
      order_number: order.order_number,
      payment_intent_id: order.payment_intent_id || '',
      created: order.created,
      total_amount: order.total_amount || 0,
      status: order.status || '',
      product_type: order.product_type || 'shop',
      product: sanitizeProduct(product),
      return_request: sanitizeReturn(latestReturn),
    };
  }));

  res.json({
    lookup,
    order_number: baseOrder.order_number || '',
    payment_intent_id: baseOrder.payment_intent_id || '',
    items,
  });
});

router.post('/', requireAuth, async (req, res) => {
  const buyerId = String(req.auth.id);
  const orderId = String(req.body?.orderId || '').trim();
  const reason = String(req.body?.reason || '').trim();
  const details = String(req.body?.details || '').trim();

  if (!orderId || !reason) {
    return res.status(400).json({ error: 'orderId and reason are required' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (String(order.buyer_id || '') !== buyerId) {
    return res.status(403).json({ error: 'You do not have access to this order' });
  }

  const existingReturn = await pb.collection('returns').getFirstListItem(
    `order_id="${escapeFilterValue(orderId)}" && (status="Pending" || status="Approved")`
  ).catch(() => null);

  if (existingReturn) {
    return res.status(400).json({ error: 'A return request already exists for this order' });
  }

  const productType = order.product_type === 'shop' ? 'shop' : 'marketplace';
  const createdAtMs = new Date(order.created || order.created_at || Date.now()).getTime();
  const claimWindowExpiresAt = productType === 'marketplace' && Number.isFinite(createdAtMs)
    ? new Date(createdAtMs + TWO_DAY_CLAIM_WINDOW_MS).toISOString()
    : '';
  const isInsideMarketplaceClaimWindow = productType === 'marketplace'
    && Number.isFinite(createdAtMs)
    && (Date.now() <= (createdAtMs + TWO_DAY_CLAIM_WINDOW_MS));

  if (productType === 'marketplace' && !isInsideMarketplaceClaimWindow && !details) {
    return res.status(400).json({
      error: 'Marketplace claims after the 2-day window require additional details',
    });
  }

  const returnType = productType === 'shop'
    ? 'shop_return'
    : isInsideMarketplaceClaimWindow
      ? 'marketplace_claim'
      : 'marketplace_form';

  const record = await pb.collection('returns').create({
    order_id: order.id,
    product_id: order.product_id,
    seller_id: order.seller_id,
    buyer_id: buyerId,
    reason,
    details,
    status: 'Pending',
    refund_amount: 0,
    product_type: productType,
    return_type: returnType,
    claim_window_expires_at: claimWindowExpiresAt,
  });

  logger.info(`[RETURNS] Created return request - Return: ${record.id}, Order: ${order.id}, Type: ${returnType}`);

  res.status(201).json({
    success: true,
    item: sanitizeReturn(record),
  });
});

router.post('/:returnId/approve', requireAuth, async (req, res) => {
  assertAdmin(req);

  const returnId = String(req.params.returnId || '').trim();
  const adminNotes = String(req.body?.adminNotes || '').trim();
  const refundAmount = Number(req.body?.refundAmount || 0) || 0;

  const returnRequest = await pb.collection('returns').getOne(returnId).catch(() => null);
  if (!returnRequest) {
    return res.status(404).json({ error: 'Return request not found' });
  }

  const order = await pb.collection('orders').getOne(returnRequest.order_id).catch(() => null);
  if (!order) {
    return res.status(404).json({ error: 'Related order not found' });
  }

  if (returnRequest.dhl_tracking_number && returnRequest.dhl_label_pdf) {
    let refundFields = {};
    try {
      refundFields = await ensureStripeRefundForReturn({
        returnRequest,
        order,
        refundAmount,
        requestedBy: req.auth?.id || '',
      });
    } catch (refundError) {
      await pb.collection('returns').update(returnId, {
        refund_status: 'failed',
        refund_failure: refundError.message,
      }).catch(() => null);

      logger.error(`[RETURNS] Refund failed for already-labelled return ${returnId}: ${refundError.message}`);
      return res.status(refundError.status || 400).json({
        error: 'Could not process return refund',
        details: refundError.message,
      });
    }

    const updated = await pb.collection('returns').update(returnId, {
      status: 'Approved',
      admin_notes: adminNotes,
      refund_amount: refundAmount,
      ...refundFields,
    });

    return res.json({
      success: true,
      item: sanitizeReturn(updated),
    });
  }

  let labelJob = null;

  try {
    const { shipper, recipient } = await getReturnLabelContext(returnRequest, order);
    const product = await fetchOrderProduct(order);
    const jobStart = await beginDhlLabelJob({
      subjectType: 'return_label',
      subjectId: returnId,
      idempotencyKey: buildReturnLabelIdempotencyKey(returnRequest, order),
      requestedBy: req.auth?.id || '',
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number || '',
        productType: order.product_type || '',
        productId: order.product_id || '',
        requestedVia: 'return_approve',
      },
    });

    labelJob = jobStart.job;

    if (jobStart.state === 'generated') {
      return res.status(409).json({
        error: 'Return label job is already marked generated and needs reconciliation',
      });
    }

    await pb.collection('returns').update(returnId, {
      label_last_attempt_at: new Date().toISOString(),
      label_idempotency_key: buildReturnLabelIdempotencyKey(returnRequest, order),
      label_failure_type: '',
      label_retry_after: '',
    }).catch(() => null);

    const dhlResult = await generateLabel({
      id: returnId,
      order_number: `RET-${order.order_number || order.id}`,
      shipper,
      recipient,
      parcel: buildParcelFromProduct(product),
    });

    const labelPdfBase64 = Buffer.isBuffer(dhlResult.label_pdf)
      ? dhlResult.label_pdf.toString('base64')
      : String(dhlResult.label_pdf || '').trim();

    let updated;
    try {
      updated = await pb.collection('returns').update(returnId, {
        status: 'Approved',
        admin_notes: adminNotes,
        refund_amount: 0,
        dhl_tracking_number: dhlResult.tracking_number,
        dhl_label_pdf: labelPdfBase64,
        label_generated_at: dhlResult.generated_at || new Date().toISOString(),
        label_failure_type: '',
        label_retry_after: '',
      });
    } catch (persistError) {
      persistError.dhl = {
        type: 'persistence_after_label_create',
        retryable: false,
        ambiguous: true,
        operation: 'save_generated_return_label',
      };
      throw persistError;
    }

    await completeDhlLabelJob(labelJob, dhlResult);

    logger.info(`[RETURNS] Approved return request - Return: ${returnId}, Tracking: ${dhlResult.tracking_number}`);

    let refundFields = {};
    try {
      refundFields = await ensureStripeRefundForReturn({
        returnRequest: updated,
        order,
        refundAmount,
        requestedBy: req.auth?.id || '',
      });
      updated = await pb.collection('returns').update(returnId, {
        refund_amount: refundAmount,
        ...refundFields,
      });
    } catch (refundError) {
      await pb.collection('returns').update(returnId, {
        refund_amount: refundAmount,
        refund_status: 'failed',
        refund_failure: refundError.message,
      }).catch(() => null);

      logger.error(`[RETURNS] Return approved but refund failed - Return: ${returnId}, Error: ${refundError.message}`);
      return res.status(refundError.status || 400).json({
        error: 'Return approved, but refund failed',
        details: refundError.message,
      });
    }

    return res.json({
      success: true,
      item: sanitizeReturn(updated),
    });
  } catch (error) {
    await failDhlLabelJob(labelJob, error);
    await pb.collection('returns').update(returnId, {
      label_failure_type: getDhlErrorType(error),
      label_retry_after: error?.dhl?.ambiguous === true || error?.name === 'DhlLabelJobConflictError'
        ? ''
        : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }).catch(() => null);

    logger.error(`[RETURNS] Approval failed - Return: ${returnId}, Error: ${error.message}`);
    return res.status(error.status || 400).json({
      error: 'Could not approve return request',
      details: error.message,
    });
  }
});

router.post('/:returnId/reject', requireAuth, async (req, res) => {
  assertAdmin(req);

  const returnId = String(req.params.returnId || '').trim();
  const adminNotes = String(req.body?.adminNotes || '').trim();

  const returnRequest = await pb.collection('returns').getOne(returnId).catch(() => null);
  if (!returnRequest) {
    return res.status(404).json({ error: 'Return request not found' });
  }

  const updated = await pb.collection('returns').update(returnId, {
    status: 'Rejected',
    admin_notes: adminNotes,
  });

  logger.info(`[RETURNS] Rejected return request - Return: ${returnId}`);

  res.json({
    success: true,
    item: sanitizeReturn(updated),
  });
});

router.get('/:returnId/label-pdf', requireAuth, async (req, res) => {
  const returnId = String(req.params.returnId || '').trim();

  const returnRequest = await pb.collection('returns').getOne(returnId).catch(() => null);
  if (!returnRequest) {
    return res.status(404).json({ error: 'Return request not found' });
  }

  assertReturnOwner(req, returnRequest);

  if (!returnRequest.dhl_label_pdf) {
    return res.status(404).json({ error: 'No return label is available for this request' });
  }

  const pdfBuffer = Buffer.from(returnRequest.dhl_label_pdf, 'base64');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="return-label-${returnId}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  return res.send(pdfBuffer);
});

export default router;
