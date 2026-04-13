import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';

/**
 * Update product status in PocketBase
 * @param {string} productId - Product ID
 * @param {string} newStatus - New status (e.g., 'pending_verification')
 * @throws {Error} If update fails
 */
export const updateProductStatus = async (productId, newStatus) => {
  const productIdStr = String(productId).trim();
  const statusStr = String(newStatus).trim();

  logger.info(`[STRIPE-SERVICE] Updating product status - Product: ${productIdStr}, Status: ${statusStr}`);

  const updated = await pb.collection('products').update(productIdStr, {
    status: statusStr,
    verification_requested_at: new Date().toISOString(),
  });

  logger.info(`[STRIPE-SERVICE] Product status updated - Product: ${productIdStr}, Status: ${statusStr}`);
  return updated;
};

/**
 * Create shipment record in PocketBase
 * @param {string} productId - Product ID
 * @param {string} sellerId - Seller ID
 * @param {string} trackingNumber - DHL tracking number
 * @param {string} labelUrl - DHL label URL
 * @throws {Error} If creation fails
 */
export const createShipmentRecord = async (productId, sellerId, trackingNumber, labelUrl) => {
  const productIdStr = String(productId).trim();
  const sellerIdStr = String(sellerId).trim();
  const trackingNumberStr = String(trackingNumber).trim();
  const labelUrlStr = labelUrl ? String(labelUrl).trim() : null;

  logger.info(`[STRIPE-SERVICE] Creating shipment record - Product: ${productIdStr}, Seller: ${sellerIdStr}, Tracking: ${trackingNumberStr}`);

  const shipment = await pb.collection('shipments').create({
    product_id: productIdStr,
    seller_id: sellerIdStr,
    dhl_tracking_number: trackingNumberStr,
    dhl_label_url: labelUrlStr,
    shipment_type: 'verification',
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  logger.info(`[STRIPE-SERVICE] Shipment record created - ID: ${shipment.id}, Tracking: ${trackingNumberStr}`);
  return shipment;
};