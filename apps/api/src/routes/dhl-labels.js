import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { canGenerateLabelForStatus } from '../utils/orderStatus.js';
import { cancelLabel, generateLabel, getTrackingStatus } from '../utils/dhlService.js';
import {
  buildDhlTrackingOrderResponse,
  persistDhlTrackingForOrder,
} from '../utils/dhlTrackingConfirmation.js';
import {
  beginDhlLabelJob,
  cancelDhlLabelJob,
  completeDhlLabelJob,
  failDhlLabelJob,
} from '../utils/dhlLabelJobs.js';
import { auth, requireAuth } from '../middleware/index.js';
import { normalizeCountryCode } from '../utils/countryCodes.js';

const router = express.Router();
router.use(auth);
router.use(requireAuth);

const labelGenerationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.max(1, Number(process.env.DHL_LABEL_GENERATION_RATE_LIMIT || 10)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many DHL label requests, please try again later' },
});

const trackingRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Math.max(1, Number(process.env.DHL_TRACKING_RATE_LIMIT || 30)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many DHL tracking requests, please try again later' },
});

const activeLabelGenerations = new Set();

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const parseAddress = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const normalizeShipper = () => ({
  name: String(process.env.WAREHOUSE_NAME || '').trim(),
  street: String(process.env.WAREHOUSE_ADDRESS_STREET || '').trim(),
  postal_code: String(process.env.WAREHOUSE_ADDRESS_ZIP || '').trim(),
  city: String(process.env.WAREHOUSE_ADDRESS_CITY || '').trim(),
  country: normalizeCountryCode(process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE'),
});

const normalizeRecipient = (buyer, shippingAddress) => ({
  name: String(
    shippingAddress.name ||
    shippingAddress.fullName ||
    shippingAddress.name1 ||
    buyer?.name ||
    buyer?.full_name ||
    buyer?.email ||
    ''
  ).trim(),
  street: String(
    shippingAddress.street ||
    shippingAddress.addressStreet ||
    shippingAddress.street_address ||
    shippingAddress.address ||
    ''
  ).trim(),
  postal_code: String(
    shippingAddress.postalCode ||
    shippingAddress.postal_code ||
    shippingAddress.zip ||
    ''
  ).trim(),
  city: String(shippingAddress.city || '').trim(),
  country: normalizeCountryCode(shippingAddress.country || 'DE'),
});

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const normalizeSellerAddress = (seller, shippingInfo) => ({
  name: String(
    shippingInfo?.full_name ||
    shippingInfo?.name ||
    seller?.name ||
    seller?.seller_username ||
    seller?.email ||
    ''
  ).trim(),
  street: String(
    shippingInfo?.street_address ||
    shippingInfo?.street ||
    shippingInfo?.addressStreet ||
    shippingInfo?.address ||
    ''
  ).trim(),
  postal_code: String(shippingInfo?.postal_code || shippingInfo?.postalCode || shippingInfo?.zip || '').trim(),
  city: String(shippingInfo?.city || '').trim(),
  country: normalizeCountryCode(shippingInfo?.country || 'DE'),
});

const fetchOrderProduct = async (order) => {
  if (!order?.product_id) return null;

  const collectionName = order.product_type === 'shop' ? 'shop_products' : 'products';
  const fallbackCollection = collectionName === 'products' ? 'shop_products' : 'products';

  try {
    return await pb.collection(collectionName).getOne(order.product_id);
  } catch {
    return pb.collection(fallbackCollection).getOne(order.product_id).catch(() => null);
  }
};

const buildParcelFromProduct = (product) => ({
  weight_g: product?.weight_g || product?.weight_grams || product?.weight || null,
  length_mm: product?.length_mm || product?.length || null,
  width_mm: product?.width_mm || product?.width || null,
  height_mm: product?.height_mm || product?.height || null,
});

const buildOrderLabelIdempotencyKey = (order) => [
  'order',
  order?.id || '',
  order?.payment_intent_id || '',
  order?.product_id || '',
].filter(Boolean).join(':');

const getDhlErrorType = (error) => error?.dhl?.type || error?.details?.job?.failure_type || error?.name || 'unknown';

const canAccessOrder = (req, order) => (
  req.auth?.is_admin === true ||
  String(order.buyer_id || '') === String(req.auth?.id || '') ||
  String(order.seller_id || '') === String(req.auth?.id || '')
);

const canGenerateOrderLabel = (req, order) => (
  req.auth?.is_admin === true ||
  String(order.seller_id || '') === String(req.auth?.id || '')
);

const assertOrderAccess = (req, order) => {
  if (!canAccessOrder(req, order)) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
};

const assertGenerateAccess = (req, order) => {
  if (!canGenerateOrderLabel(req, order)) {
    const error = new Error('Only the seller or an admin can generate a shipping label');
    error.status = 403;
    throw error;
  }
};

const getSellerShipper = async (sellerId) => {
  const [seller, shippingInfo] = await Promise.all([
    sellerId ? pb.collection('users').getOne(sellerId).catch(() => null) : Promise.resolve(null),
    sellerId ? pb.collection('shipping_info').getFirstListItem(`user_id="${escapeFilterValue(sellerId)}"`).catch(() => null) : Promise.resolve(null),
  ]);

  return normalizeSellerAddress(seller, shippingInfo);
};

const getShipperForOrder = async (order) => {
  if (order.product_type === 'shop') {
    return normalizeShipper();
  }

  return getSellerShipper(order.seller_id);
};

const getMissingAddressFields = (prefix, address) => {
  const missing = [];
  if (isBlank(address.name)) missing.push(`${prefix}.name`);
  if (isBlank(address.street)) missing.push(`${prefix}.street`);
  if (isBlank(address.postal_code)) missing.push(`${prefix}.postal_code`);
  if (isBlank(address.city)) missing.push(`${prefix}.city`);
  if (isBlank(address.country)) missing.push(`${prefix}.country`);
  return missing;
};

router.get('/debug/order/:order_id', async (req, res) => {
  const orderIdStr = String(req.params.order_id || '').trim();

  if (!orderIdStr) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  try {
    const order = await pb.collection('orders').getOne(orderIdStr);
    assertOrderAccess(req, order);
    const buyer = order.buyer_id ? await pb.collection('users').getOne(order.buyer_id).catch(() => null) : null;

    const shippingAddress = parseAddress(order.shipping_address);
    const shipper = await getShipperForOrder(order);
    const recipient = normalizeRecipient(buyer, shippingAddress);

    const missingFields = [
      ...getMissingAddressFields('shipper', shipper),
      ...getMissingAddressFields('recipient', recipient),
    ];

    return res.json({
      success: true,
      order_id: orderIdStr,
      order_status: order.status,
      label_status: order.label_status || null,
      has_existing_label: !!order.dhl_tracking_number,
      tracking_number: order.dhl_tracking_number || null,
      shipper,
      recipient,
      missing_fields: missingFields,
      can_generate_label: canGenerateLabelForStatus(order.status) && missingFields.length === 0,
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }

    logger.error(`[DHL LABEL] Debug failed - Order: ${orderIdStr}, Error: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
});

router.post('/generate-label', labelGenerationRateLimit, async (req, res) => {
  const { order_id, orderId } = req.body || {};
  const orderIdStr = String(orderId || order_id || '').trim();

  if (!orderIdStr) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  logger.info(`[DHL LABEL] Generate label request - Order: ${orderIdStr}`);

  if (activeLabelGenerations.has(orderIdStr)) {
    return res.status(409).json({
      error: 'DHL label generation is already in progress for this order',
      label_status: 'generating',
    });
  }

  let order;
  try {
    order = await pb.collection('orders').getOne(orderIdStr);
  } catch (error) {
    logger.error(`[DHL LABEL] Order not found - ${orderIdStr} - ${error.message}`);
    return res.status(400).json({ error: 'Order not found' });
  }

  try {
    assertGenerateAccess(req, order);
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }

  if (order.dhl_tracking_number && order.dhl_label_pdf) {
    return res.status(200).json({
      success: true,
      idempotent: true,
      order_id: orderIdStr,
      tracking_number: order.dhl_tracking_number,
      shipmentNumber: order.dhl_tracking_number,
      label_pdf: order.dhl_label_pdf,
      labelPdfBase64: order.dhl_label_pdf,
      generated_at: order.label_generated_at || null,
      destination_country: order.destination_country || null,
      product_used: order.dhl_product_used || null,
    });
  }

  if (!canGenerateLabelForStatus(order.status)) {
    return res.status(400).json({
      error: 'Order is not in a label-eligible status',
      currentStatus: order.status,
    });
  }

  const shippingAddress = parseAddress(order.shipping_address);

  const buyer = order.buyer_id
    ? await pb.collection('users').getOne(order.buyer_id).catch(() => null)
    : null;

  const [shipper, product] = await Promise.all([
    getShipperForOrder(order),
    fetchOrderProduct(order),
  ]);
  const recipient = normalizeRecipient(buyer, shippingAddress);

  const missingFields = [
    ...getMissingAddressFields('shipper', shipper),
    ...getMissingAddressFields('recipient', recipient),
  ];

  if (missingFields.length > 0) {
    const errorMessage = `Missing DHL address fields: ${missingFields.join(', ')}`;

    await pb.collection('orders').update(orderIdStr, {
      label_status: 'failed',
      label_error: errorMessage,
      label_failure_type: 'validation',
      label_retry_after: '',
    }).catch(() => { });

    return res.status(400).json({
      error: 'DHL address validation failed',
      details: errorMessage,
      missingFields,
    });
  }

  activeLabelGenerations.add(orderIdStr);

  let labelJob = null;

  try {
    const jobStart = await beginDhlLabelJob({
      subjectType: 'order_outbound',
      subjectId: orderIdStr,
      idempotencyKey: buildOrderLabelIdempotencyKey(order),
      requestedBy: req.auth?.id || '',
      metadata: {
        orderNumber: order.order_number || '',
        productType: order.product_type || '',
        productId: order.product_id || '',
        paymentIntentId: order.payment_intent_id || '',
        requestedVia: 'manual_route',
      },
    });

    labelJob = jobStart.job;

    if (jobStart.state === 'generated') {
      return res.status(409).json({
        error: 'DHL label job is already marked generated, but the order label fields need reconciliation',
        label_status: 'unknown',
      });
    }

    await pb.collection('orders').update(orderIdStr, {
      label_status: 'generating',
      label_error: '',
      label_failure_type: '',
      label_last_attempt_at: new Date().toISOString(),
      label_idempotency_key: buildOrderLabelIdempotencyKey(order),
    }).catch(() => { });

    const dhlResult = await generateLabel({
      id: orderIdStr,
      order_number: order.order_number,
      shipper,
      recipient,
      parcel: buildParcelFromProduct(product),
    });

    const labelPdfBase64 = Buffer.isBuffer(dhlResult.label_pdf)
      ? dhlResult.label_pdf.toString('base64')
      : String(dhlResult.label_pdf || '').trim();

    if (!labelPdfBase64) {
      throw new Error('DHL response did not contain a label PDF');
    }

    try {
      await pb.collection('orders').update(orderIdStr, {
        dhl_tracking_number: dhlResult.tracking_number,
        dhl_shipment_number: dhlResult.shipment_number || dhlResult.tracking_number,
        tracking_number: dhlResult.tracking_number,
        dhl_label_pdf: labelPdfBase64,
        label_generated_at: dhlResult.generated_at || new Date().toISOString(),
        label_status: 'generated',
        label_error: '',
        label_failure_type: '',
        label_retry_after: '',
        destination_country: dhlResult.destination_country || recipient.country,
        dhl_product_used: dhlResult.product_used || null,
      });
    } catch (persistError) {
      persistError.dhl = {
        type: 'persistence_after_label_create',
        retryable: false,
        ambiguous: true,
        operation: 'save_generated_label',
      };
      throw persistError;
    }

    await completeDhlLabelJob(labelJob, dhlResult);

    return res.status(200).json({
      success: true,
      idempotent: false,
      order_id: orderIdStr,
      tracking_number: dhlResult.tracking_number,
      shipmentNumber: dhlResult.tracking_number,
      label_pdf: labelPdfBase64,
      labelPdfBase64,
      generated_at: dhlResult.generated_at || new Date().toISOString(),
      destination_country: dhlResult.destination_country || recipient.country,
      product_used: dhlResult.product_used || null,
    });
  } catch (error) {
    logger.error(`[DHL LABEL] DHL generation failed - Order: ${orderIdStr}, Error: ${error.message}`);

    await failDhlLabelJob(labelJob, error);
    const labelStatus = error?.dhl?.ambiguous === true || error?.name === 'DhlLabelJobConflictError'
      ? 'unknown'
      : 'failed';

    await pb.collection('orders').update(orderIdStr, {
      label_status: labelStatus,
      label_error: error.message,
      label_failure_type: getDhlErrorType(error),
      label_retry_after: labelStatus === 'failed' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : '',
    }).catch(() => { });

    return res.status(error.status || 400).json({
      error: 'DHL label generation failed',
      details: error.message,
      label_status: labelStatus,
    });
  } finally {
    activeLabelGenerations.delete(orderIdStr);
  }
});

router.delete('/:order_id', async (req, res) => {
  const orderIdStr = String(req.params.order_id || '').trim();

  if (!orderIdStr) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  if (activeLabelGenerations.has(orderIdStr)) {
    return res.status(409).json({
      error: 'DHL label generation is currently in progress for this order',
      label_status: 'generating',
    });
  }

  try {
    const order = await pb.collection('orders').getOne(orderIdStr);
    assertGenerateAccess(req, order);

    const shipmentNumber = order.dhl_shipment_number || order.dhl_tracking_number || order.tracking_number || '';
    if (!shipmentNumber) {
      return res.status(404).json({ error: 'No DHL shipment number is available for this order' });
    }

    const cancellation = await cancelLabel(shipmentNumber);

    await pb.collection('orders').update(orderIdStr, {
      dhl_tracking_number: '',
      dhl_shipment_number: '',
      tracking_number: '',
      dhl_label_pdf: '',
      label_generated_at: '',
      label_status: 'cancelled',
      label_error: '',
      destination_country: '',
      dhl_product_used: '',
      label_failure_type: '',
      label_retry_after: '',
      label_idempotency_key: '',
    });

    await cancelDhlLabelJob('order_outbound', orderIdStr);

    return res.json({
      success: true,
      order_id: orderIdStr,
      ...cancellation,
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }

    logger.error(`[DHL LABEL] Cancellation failed - Order: ${orderIdStr}, Error: ${error.message}`);
    return res.status(400).json({
      error: 'DHL label cancellation failed',
      details: error.message,
    });
  }
});

router.get('/:order_id/pdf', async (req, res) => {
  const orderIdStr = String(req.params.order_id || '').trim();

  if (!orderIdStr) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  try {
    const order = await pb.collection('orders').getOne(orderIdStr);
    assertOrderAccess(req, order);

    if (!order.dhl_label_pdf) {
      return res.status(404).json({ error: 'Label PDF not found for this order' });
    }

    const pdfBuffer = Buffer.from(order.dhl_label_pdf, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label-${orderIdStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    logger.error(`[DHL LABEL] PDF download failed - Order: ${orderIdStr}, Error: ${error.message}`);
    return res.status(404).json({ error: 'Order not found' });
  }
});

router.get('/:order_id/tracking', trackingRateLimit, async (req, res) => {
  const orderIdStr = String(req.params.order_id || '').trim();

  if (!orderIdStr) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  try {
    const order = await pb.collection('orders').getOne(orderIdStr);
    assertOrderAccess(req, order);

    const trackingNumber = order.tracking_number || order.dhl_tracking_number || order.dhl_shipment_number || '';
    if (!trackingNumber) {
      return res.status(404).json({ error: 'No DHL tracking number is available for this order' });
    }

    const tracking = await getTrackingStatus(trackingNumber);
    const persistence = await persistDhlTrackingForOrder({
      order,
      tracking,
      requestedBy: req.auth?.id || '',
      source: 'dhl_label_tracking_route',
    });

    return res.json({
      order_id: orderIdStr,
      tracking_number: trackingNumber,
      tracking_url: `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${encodeURIComponent(trackingNumber)}`,
      delivery_confirmation: persistence.confirmation,
      status_changed: persistence.status_changed,
      order: buildDhlTrackingOrderResponse(persistence.order),
      ...tracking,
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }

    logger.error(`[DHL LABEL] Tracking lookup failed - Order: ${orderIdStr}, Error: ${error.message}`);
    return res.status(400).json({
      error: 'DHL tracking lookup failed',
      details: error.message,
    });
  }
});

export default router;
