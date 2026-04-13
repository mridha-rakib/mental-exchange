import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { generateLabel } from '../utils/dhlService.js';
import { auth } from '../middleware/index.js';

const router = express.Router();
router.use(auth);

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
  country: String(process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE').trim(),
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
  country: String(shippingAddress.country || 'DE').trim(),
});

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
    const buyer = order.buyer_id ? await pb.collection('users').getOne(order.buyer_id).catch(() => null) : null;

    const shippingAddress = parseAddress(order.shipping_address);
    const shipper = normalizeShipper();
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
      can_generate_label: order.status === 'paid' && missingFields.length === 0,
    });
  } catch (error) {
    logger.error(`[DHL LABEL] Debug failed - Order: ${orderIdStr}, Error: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
});

router.post('/generate-label', async (req, res) => {
  const { order_id, orderId } = req.body || {};
  const orderIdStr = String(orderId || order_id || '').trim();

  if (!orderIdStr) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  logger.info(`[DHL LABEL] Generate label request - Order: ${orderIdStr}`);

  let order;
  try {
    order = await pb.collection('orders').getOne(orderIdStr);
  } catch (error) {
    logger.error(`[DHL LABEL] Order not found - ${orderIdStr} - ${error.message}`);
    return res.status(400).json({ error: 'Order not found' });
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

  if (order.status !== 'paid') {
    return res.status(400).json({
      error: 'Order is not paid yet',
      currentStatus: order.status,
    });
  }

  const shippingAddress = parseAddress(order.shipping_address);

  const buyer = order.buyer_id
    ? await pb.collection('users').getOne(order.buyer_id).catch(() => null)
    : null;

  const shipper = normalizeShipper();
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
    }).catch(() => { });

    return res.status(400).json({
      error: 'DHL address validation failed',
      details: errorMessage,
      missingFields,
    });
  }

  try {
    const dhlResult = await generateLabel({
      id: orderIdStr,
      order_number: order.order_number,
      shipper,
      recipient,
    });

    const labelPdfBase64 = Buffer.isBuffer(dhlResult.label_pdf)
      ? dhlResult.label_pdf.toString('base64')
      : String(dhlResult.label_pdf || '').trim();

    if (!labelPdfBase64) {
      throw new Error('DHL response did not contain a label PDF');
    }

    await pb.collection('orders').update(orderIdStr, {
      dhl_tracking_number: dhlResult.tracking_number,
      tracking_number: dhlResult.tracking_number,
      dhl_label_pdf: labelPdfBase64,
      label_generated_at: dhlResult.generated_at || new Date().toISOString(),
      label_status: 'generated',
      label_error: '',
      destination_country: dhlResult.destination_country || recipient.country,
      dhl_product_used: dhlResult.product_used || null,
    });

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

    await pb.collection('orders').update(orderIdStr, {
      label_status: 'failed',
      label_error: error.message,
    }).catch(() => { });

    return res.status(400).json({
      error: 'DHL label generation failed',
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

    if (!order.dhl_label_pdf) {
      return res.status(404).json({ error: 'Label PDF not found for this order' });
    }

    const pdfBuffer = Buffer.from(order.dhl_label_pdf, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label-${orderIdStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error(`[DHL LABEL] PDF download failed - Order: ${orderIdStr}, Error: ${error.message}`);
    return res.status(404).json({ error: 'Order not found' });
  }
});

export default router;