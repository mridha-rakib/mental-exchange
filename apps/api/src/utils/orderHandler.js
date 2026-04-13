import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { generateLabel } from './dhlService.js';
import {
  sendOrderConfirmationToBuyer,
  sendOrderNotificationToSeller,
  sendTrackingEmailToBuyer
} from './emailService.js';
import { getPlatformSettings, getSellerFeeRate, normalizePlatformSettings } from './platformSettings.js';

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
    buyer?.name ||
    buyer?.full_name ||
    buyer?.email ||
    ''
  ).trim(),
  street: String(
    parsedAddress?.street ||
    parsedAddress?.addressStreet ||
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
  country: String(parsedAddress?.country || 'DE').trim(),
});

const getMissingRecipientFields = (address) => {
  const missing = [];
  if (!address.name) missing.push('recipient.name');
  if (!address.street) missing.push('recipient.street');
  if (!address.postal_code) missing.push('recipient.postal_code');
  if (!address.city) missing.push('recipient.city');
  if (!address.country) missing.push('recipient.country');
  return missing;
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
    throw new Error(`Failed to create order: ${error.message}`);
  }

  const orderIdStr = String(order.id);

  logger.info(`[ORDER-HANDLER] Order created - ${orderIdStr}`);

  let dhlLabelPdf = null;
  let trackingNumber = null;

  try {
    const parsedAddress = parseShippingAddress(shippingAddress);
    const recipient = normalizeRecipientAddress(parsedAddress, buyer);
    const missingFields = getMissingRecipientFields(recipient);

    if (missingFields.length > 0) {
      const errorMessage = `Missing DHL recipient fields: ${missingFields.join(', ')}`;

      await pb.collection('orders').update(orderIdStr, {
        label_status: 'failed',
        label_error: errorMessage,
      }).catch(() => { });

      throw new Error(errorMessage);
    }

    const orderForDHL = {
      id: orderIdStr,
      order_number: orderNumber,
      shipper: {
        name: process.env.WAREHOUSE_NAME || '',
        street: process.env.WAREHOUSE_ADDRESS_STREET || '',
        postal_code: process.env.WAREHOUSE_ADDRESS_ZIP || '',
        city: process.env.WAREHOUSE_ADDRESS_CITY || '',
        country: process.env.WAREHOUSE_ADDRESS_COUNTRY || 'DE',
      },
      recipient,
    };

    const dhlResult = await generateLabel(orderForDHL);

    dhlLabelPdf = dhlResult.label_pdf;
    trackingNumber = dhlResult.tracking_number;

    await pb.collection('orders').update(orderIdStr, {
      dhl_label_pdf: Buffer.isBuffer(dhlLabelPdf) ? dhlLabelPdf.toString('base64') : String(dhlLabelPdf || ''),
      dhl_tracking_number: trackingNumber,
      tracking_number: trackingNumber,
      label_generated_at: new Date().toISOString(),
      label_status: 'generated',
      label_error: '',
    });

    logger.info(`[ORDER-HANDLER] DHL label generated - Tracking: ${trackingNumber}`);
  } catch (dhlError) {
    logger.warn(`[ORDER-HANDLER] DHL label generation failed: ${dhlError.message}`);

    await pb.collection('orders').update(orderIdStr, {
      label_status: 'failed',
      label_error: dhlError.message,
    }).catch(() => { });
  }

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
      const trackingUrl = trackingNumber
        ? `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${trackingNumber}`
        : null;

      await sendOrderNotificationToSeller(order, product, seller, trackingUrl);
    } catch (emailError) {
      logger.warn(`[ORDER-HANDLER] Seller notification email failed: ${emailError.message}`);
    }
  }

  if (trackingNumber) {
    try {
      const trackingUrl = `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${trackingNumber}`;
      await sendTrackingEmailToBuyer(order, trackingNumber, trackingUrl);
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
