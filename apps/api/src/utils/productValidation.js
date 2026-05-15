import pb from './pocketbaseClient.js';
import logger from './logger.js';

const safeJsonObject = (value, fallback = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const buildProductValidationSnapshot = (product) => ({
  id: product.id,
  name: product.name || '',
  description: product.description || '',
  price: product.price || 0,
  image: product.image || '',
  images: Array.isArray(product.images) ? product.images : product.images ? [product.images] : [],
  condition: product.condition || '',
  product_type: product.product_type || '',
  fachbereich: product.fachbereich || [],
  brand: product.brand || '',
  location: product.location || '',
  shipping_type: product.shipping_type || 'dhl_parcel',
  filter_values: safeJsonObject(product.filter_values),
  seller_id: product.seller_id || '',
  seller_username: product.seller_username || '',
  status: product.status || '',
  verification_status: product.verification_status || '',
  created: product.created || product.created_at || '',
  updated: product.updated || product.updated_at || '',
});

export const createProductVerificationAudit = async ({
  product,
  status,
  adminId = '',
  adminNotes = '',
  verificationFee,
}) => {
  if (!product?.id || !product?.seller_id) return null;

  const record = {
    product_id: product.id,
    seller_id: product.seller_id,
    status,
    admin_notes: adminNotes || '',
    admin_id: adminId || '',
    reviewed_at: status === 'pending' ? '' : new Date().toISOString(),
    product_snapshot: buildProductValidationSnapshot(product),
  };

  if (verificationFee !== undefined && verificationFee !== null && verificationFee !== '') {
    record.verification_fee = Number(verificationFee) || 0;
  }

  return pb.collection('product_verifications').create(record, { $autoCancel: false }).catch((error) => {
    logger.warn(`[PRODUCT-VALIDATION] Failed to write audit - Product: ${product.id}, Status: ${status}, Error: ${error.message}`);
    return null;
  });
};
