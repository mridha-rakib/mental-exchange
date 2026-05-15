import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { generateLabel } from './dhlService.js';
import {
  beginDhlLabelJob,
  completeDhlLabelJob,
  failDhlLabelJob,
} from './dhlLabelJobs.js';
import {
  sendOrderConfirmationToBuyer,
  sendOrderNotificationToSeller,
  sendTrackingEmailToBuyer
} from './emailService.js';
import { getPlatformSettings, getSellerFeeRate, normalizePlatformSettings } from './platformSettings.js';
import { normalizeCountryCode } from './countryCodes.js';
import { syncSellerBalance } from './sellerBalance.js';

const parseShippingAddress = (addressData) => {
  if (!addressData) return {};
  if (typeof addressData === 'string') {
    try {
      return JSON.parse(addressData);
    } catch {
      return {};
    }
  }
  return addressData;
};

const normalizeRecipientAddress = (parsedAddress, buyer) => ({
  name: String(
    parsedAddress?.name ||
    parsedAddress?.fullName ||
    parsedAddress?.name1 ||
    parsedAddress?.full_name ||
    buyer?.name ||
    buyer?.full_name ||
    buyer?.email ||
    ''
  ).trim(),
  street: String(
    parsedAddress?.street ||
    parsedAddress?.addressStreet ||
    parsedAddress?.street_address ||
    parsedAddress?.address ||
    ''
  ).trim(),
  postal_code: String(
    parsedAddress?.postalCode ||
    parsedAddress?.postal_code ||
    parsedAddress?.zip ||
    ''
  ).trim(),
  city: String(parsedAddress?.city || '').trim(),
  country: normalizeCountryCode(parsedAddress?.country || 'DE'),
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
  name: process.env.WAREHOUSE_NAME || '',
  street: process.env.WAREHOUSE_ADDRESS_STREET || '',
  postal_code: process.env.WAREHOUSE_ADDRESS_ZIP || '',
  city: process.env.WAREHOUSE_ADDRESS_CITY || '',
  country: normalizeCountryCode(process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE'),
});

const resolveSellerShippingAddress = async (sellerId, seller) => {
  const shippingInfo = await pb.collection('shipping_info')
    .getFirstListItem(`user_id="${String(sellerId).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .catch(() => null);

  return normalizeRecipientAddress(shippingInfo || {}, seller);
};

const resolveShipperAddress = async ({ productType, sellerId, seller }) => {
  if (productType === 'shop') {
    return getWarehouseAddress();
  }

  return resolveSellerShippingAddress(sellerId, seller);
};

const buildParcelFromProduct = (product) => ({
  weight_g: product.weight_g || product.weight_grams || product.weight || null,
  length_mm: product.length_mm || product.length || null,
  width_mm: product.width_mm || product.width || null,
  height_mm: product.height_mm || product.height || null,
});

const getDhlErrorType = (error) => error?.dhl?.type || error?.details?.job?.failure_type || error?.name || 'unknown';

const buildOrderLabelIdempotencyKey = (order) => [
  'order',
  order?.id || '',
  order?.payment_intent_id || '',
  order?.product_id || '',
].filter(Boolean).join(':');

const escapePbString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const getPocketBaseErrorDetails = (error) => {
  const response = error?.response || error?.data || error?.originalError?.data || {};
  const data = response?.data || response || {};

  if (!data || typeof data !== 'object') {
    return '';
  }

  return JSON.stringify(data);
};

const findExistingOrder = async (paymentIntentId, productId) => {
  const paymentIntentIdStr = String(paymentIntentId || '').trim();
  const productIdStr = String(productId || '').trim();

  if (!paymentIntentIdStr || !productIdStr) {
    return null;
  }

  return pb.collection('orders')
    .getFirstListItem(`payment_intent_id="${escapePbString(paymentIntentIdStr)}" && product_id="${escapePbString(productIdStr)}"`)
    .catch(() => null);
};

const resolvePlatformSellerId = async () => {
  if (process.env.PLATFORM_SELLER_ID) {
    return String(process.env.PLATFORM_SELLER_ID).trim();
  }

  const adminUser = await pb.collection('users')
    .getFirstListItem('is_admin=true')
    .catch(() => null);

  if (!adminUser?.id) {
    throw new Error('No platform admin user available for shop order');
  }

  return String(adminUser.id).trim();
};

export const ensureDhlLabelForOrder = async ({ order, product, buyer, seller = null, productType, sellerId }) => {
  const orderIdStr = String(order?.id || '').trim();
  const orderNumber = String(order?.order_number || '').trim();
  const productTypeStr = productType === 'shop' || order?.product_type === 'shop' ? 'shop' : 'marketplace';
  const sellerIdStr = String(sellerId || order?.seller_id || '').trim();

  if (!orderIdStr) {
    throw new Error('order.id is required for DHL label generation');
  }

  if (order?.dhl_tracking_number && order?.dhl_label_pdf) {
    return {
      order,
      dhlLabelPdf: order.dhl_label_pdf,
      trackingNumber: order.dhl_tracking_number,
      idempotent: true,
    };
  }

  let dhlLabelPdf = null;
  let trackingNumber = null;
  let labelJob = null;

  try {
    const jobStart = await beginDhlLabelJob({
      subjectType: 'order_outbound',
      subjectId: orderIdStr,
      idempotencyKey: buildOrderLabelIdempotencyKey(order),
      requestedBy: sellerIdStr,
      metadata: {
        orderNumber,
        productType: productTypeStr,
        productId: order?.product_id || '',
        paymentIntentId: order?.payment_intent_id || '',
      },
    });

    labelJob = jobStart.job;

    if (jobStart.state === 'generated') {
      return {
        order,
        dhlLabelPdf: order.dhl_label_pdf || null,
        trackingNumber: labelJob.tracking_number || order.dhl_tracking_number || '',
        idempotent: true,
      };
    }

    const parsedAddress = parseShippingAddress(order.shipping_address);
    const recipient = normalizeRecipientAddress(parsedAddress, buyer);
    const shipper = await resolveShipperAddress({
      productType: productTypeStr,
      sellerId: sellerIdStr,
      seller,
    });

    logger.info(`[ORDER-HANDLER] Starting DHL label generation - Order: ${orderIdStr}, Shipper country: ${shipper.country || 'missing'}, Recipient country: ${recipient.country || 'missing'}`);

    await pb.collection('orders').update(orderIdStr, {
      label_status: 'generating',
      label_error: '',
      label_failure_type: '',
      label_last_attempt_at: new Date().toISOString(),
      label_idempotency_key: buildOrderLabelIdempotencyKey(order),
    }).catch(() => { });

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
      }).catch(() => { });

      throw new Error(errorMessage);
    }

    const dhlResult = await generateLabel({
      id: orderIdStr,
      order_number: orderNumber,
      shipper,
      recipient,
      parcel: buildParcelFromProduct(product || {}),
    });

    dhlLabelPdf = dhlResult.label_pdf;
    trackingNumber = dhlResult.tracking_number;

    const encodedLabel = Buffer.isBuffer(dhlLabelPdf) ? dhlLabelPdf.toString('base64') : String(dhlLabelPdf || '');

    try {
      await pb.collection('orders').update(orderIdStr, {
        dhl_label_pdf: encodedLabel,
        dhl_tracking_number: trackingNumber,
        dhl_shipment_number: dhlResult.shipment_number || trackingNumber,
        tracking_number: trackingNumber,
        label_generated_at: new Date().toISOString(),
        label_status: 'generated',
        label_error: '',
        label_failure_type: '',
        label_retry_after: '',
        destination_country: dhlResult.destination_country || recipient.country,
        dhl_product_used: dhlResult.product_used || '',
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

    await completeDhlLabelJob(labelJob, {
      ...dhlResult,
      label_saved: true,
    });

    const updatedOrder = {
      ...order,
      dhl_label_pdf: encodedLabel,
      dhl_tracking_number: trackingNumber,
      tracking_number: trackingNumber,
    };

    logger.info(`[ORDER-HANDLER] DHL label generated - Tracking: ${trackingNumber}`);

    return {
      order: updatedOrder,
      dhlLabelPdf,
      trackingNumber,
      idempotent: false,
    };
  } catch (dhlError) {
    logger.warn(`[ORDER-HANDLER] DHL label generation failed: ${dhlError.message}`);

    await failDhlLabelJob(labelJob, dhlError);
    const failureType = getDhlErrorType(dhlError);
    const labelStatus = dhlError?.dhl?.ambiguous === true || dhlError?.name === 'DhlLabelJobConflictError'
      ? 'unknown'
      : 'failed';

    await pb.collection('orders').update(orderIdStr, {
      label_status: labelStatus,
      label_error: dhlError.message,
      label_failure_type: failureType,
      label_retry_after: labelStatus === 'failed' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : '',
    }).catch(() => { });

    return {
      order,
      dhlLabelPdf,
      trackingNumber,
      error: dhlError,
    };
  }
};

export const orderHandler = async (paymentData) => {
  const timestamp = new Date().toISOString();
  const {
    buyerId,
    sellerId,
    productId,
    quantity = 1,
    shippingAddress,
    paymentIntentId,
    shippingFee,
    serviceFee,
    transactionFeePercentage,
    productType = 'marketplace',
  } = paymentData;

  const buyerIdStr = String(buyerId).trim();
  const productTypeStr = productType === 'shop' ? 'shop' : 'marketplace';
  let sellerIdStr = sellerId ? String(sellerId).trim() : '';
  const productIdStr = String(productId).trim();
  const paymentIntentIdStr = String(paymentIntentId).trim();
  const quantityNum = parseInt(quantity, 10) || 1;

  logger.info(`[ORDER-HANDLER] Order handler started - Timestamp: ${timestamp}`);
  logger.info(`[ORDER-HANDLER] Buyer: ${buyerIdStr}`);
  logger.info(`[ORDER-HANDLER] Seller: ${sellerIdStr || 'platform'}`);
  logger.info(`[ORDER-HANDLER] Product: ${productIdStr}`);
  logger.info(`[ORDER-HANDLER] Product type: ${productTypeStr}`);
  logger.info(`[ORDER-HANDLER] Quantity: ${quantityNum}`);
  logger.info(`[ORDER-HANDLER] Payment Intent: ${paymentIntentIdStr}`);

  let product;
  try {
    const collectionName = productTypeStr === 'shop' ? 'shop_products' : 'products';
    product = await pb.collection(collectionName).getOne(productIdStr);
    logger.info(`[ORDER-HANDLER] Product fetched - ${product.name}`);
  } catch (error) {
    logger.error(`[ORDER-HANDLER] Product fetch failed: ${error.message}`);
    throw new Error(`Product not found: ${productIdStr}`);
  }

  if (productTypeStr === 'marketplace' && product.seller_id !== sellerIdStr) {
    throw new Error('Product does not belong to the specified seller');
  }

  if (productTypeStr === 'marketplace' && product.status === 'sold') {
    throw new Error('Product is already sold');
  }

  let buyer;
  try {
    buyer = await pb.collection('users').getOne(buyerIdStr);
  } catch (error) {
    throw new Error(`Buyer not found: ${buyerIdStr}`);
  }

  if (productTypeStr === 'shop' && !sellerIdStr) {
    sellerIdStr = await resolvePlatformSellerId();
  }

  let seller = null;
  try {
    seller = await pb.collection('users').getOne(sellerIdStr);
  } catch (error) {
    if (productTypeStr === 'marketplace') {
      throw new Error(`Seller not found: ${sellerIdStr}`);
    }
  }

  const storedSettings = await getPlatformSettings();
  const platformSettings = normalizePlatformSettings({
    ...storedSettings,
    shipping_fee: shippingFee ?? storedSettings.shipping_fee,
    service_fee: serviceFee ?? storedSettings.service_fee,
    transaction_fee_percentage: transactionFeePercentage ?? storedSettings.transaction_fee_percentage,
  });
  const sellerFeeRate = getSellerFeeRate(platformSettings);

  const productPrice = product.price || 0;
  const subtotal = productPrice * quantityNum;
  const totalAmount = subtotal + platformSettings.shipping_fee + platformSettings.service_fee;
  const transactionFee = totalAmount * sellerFeeRate;
  const sellerEarnings = totalAmount - transactionFee;

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  let order;
  try {
    order = await pb.collection('orders').create({
      order_number: orderNumber,
      buyer_id: buyerIdStr,
      seller_id: sellerIdStr,
      product_id: productIdStr,
      product_type: productTypeStr,
      quantity: quantityNum,
      price: productPrice,
      shipping_fee: platformSettings.shipping_fee,
      service_fee: platformSettings.service_fee,
      total_amount: totalAmount,
      shipping_address: JSON.stringify(shippingAddress),
      payment_intent_id: paymentIntentIdStr,
      status: 'paid',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    const existingOrder = await findExistingOrder(paymentIntentIdStr, productIdStr);
    if (existingOrder) {
      logger.warn(`[ORDER-HANDLER] Order create collided with existing record - PaymentIntent: ${paymentIntentIdStr}, Product: ${productIdStr}, Existing order: ${existingOrder.id}`);
      const dhlResult = await ensureDhlLabelForOrder({
        order: existingOrder,
        product,
        buyer,
        seller,
        productType: productTypeStr,
        sellerId: sellerIdStr,
      });

      return {
        order_id: existingOrder.id,
        order_number: existingOrder.order_number,
        dhl_label_pdf: dhlResult.dhlLabelPdf || existingOrder.dhl_label_pdf || null,
        tracking_number: dhlResult.trackingNumber || existingOrder.tracking_number || existingOrder.dhl_tracking_number || null,
        total_amount: existingOrder.total_amount || 0,
        seller_earnings: 0,
        idempotent: true,
      };
    }

    const details = getPocketBaseErrorDetails(error);
    logger.error(`[ORDER-HANDLER] Failed to create order record - PaymentIntent: ${paymentIntentIdStr}, Product: ${productIdStr}, Error: ${error.message}, Details: ${details || 'none'}`);
    throw new Error(`Failed to create order: ${error.message}${details ? ` - ${details}` : ''}`);
  }

  const orderIdStr = String(order.id);

  logger.info(`[ORDER-HANDLER] Order created - ${orderIdStr}`);

  let dhlLabelPdf = null;
  let trackingNumber = null;

  const dhlResult = await ensureDhlLabelForOrder({
    order,
    product,
    buyer,
    seller,
    productType: productTypeStr,
    sellerId: sellerIdStr,
  });

  order = dhlResult.order || order;
  dhlLabelPdf = dhlResult.dhlLabelPdf;
  trackingNumber = dhlResult.trackingNumber;

  if (productTypeStr === 'marketplace') {
    try {
    await pb.collection('seller_earnings').create({
      seller_id: sellerIdStr,
      order_id: orderIdStr,
      gross_amount: totalAmount,
      transaction_fee_percentage: platformSettings.transaction_fee_percentage,
      transaction_fee: transactionFee,
      net_amount: sellerEarnings,
      status: 'pending',
    });
    await syncSellerBalance(sellerIdStr);
    } catch (error) {
      logger.warn(`[ORDER-HANDLER] Failed to create seller earnings: ${error.message}`);
    }
  }

  if (productTypeStr === 'marketplace') {
    try {
      await pb.collection('products').update(productIdStr, {
        status: 'sold',
        sold_at: new Date().toISOString(),
        sold_to_buyer_id: buyerIdStr,
        sold_order_id: orderIdStr,
      });
    } catch (error) {
      logger.error(`[ORDER-HANDLER] Failed to update product status: ${error.message}`);
      throw new Error(`Failed to mark product as sold: ${error.message}`);
    }
  }

  try {
    await sendOrderConfirmationToBuyer(order, product, buyer);
  } catch (emailError) {
    logger.warn(`[ORDER-HANDLER] Buyer confirmation email failed: ${emailError.message}`);
  }

  if (productTypeStr === 'marketplace' && seller) {
    try {
      await sendOrderNotificationToSeller(order, product, seller, dhlLabelPdf);
    } catch (emailError) {
      logger.warn(`[ORDER-HANDLER] Seller notification email failed: ${emailError.message}`);
    }
  }

  if (trackingNumber) {
    try {
      const trackingUrl = `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${trackingNumber}`;
      await sendTrackingEmailToBuyer(order, buyer.email, trackingNumber, trackingUrl);
    } catch (emailError) {
      logger.warn(`[ORDER-HANDLER] Tracking email failed: ${emailError.message}`);
    }
  }

  logger.info(`[ORDER-HANDLER] Order processing completed - Order: ${orderIdStr}`);

  return {
    order_id: orderIdStr,
    order_number: orderNumber,
    dhl_label_pdf: dhlLabelPdf,
    tracking_number: trackingNumber,
    total_amount: totalAmount,
    seller_earnings: sellerEarnings,
  };
};
