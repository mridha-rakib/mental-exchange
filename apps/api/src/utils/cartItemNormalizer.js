import logger from './logger.js';

/**
 * Normalize cart item to unified nested structure
 * Accepts multiple input formats:
 * 1. Nested: {id, product: {id, name, price, seller_id}, quantity}
 * 2. Flat: {id, product_id, product_name, product_price, seller_id, quantity}
 * 3. Mixed: {id, product_id, product: {name, price, seller_id}, quantity}
 * 4. Expanded: {id, product_id, product: {id, name, price, seller_id}, quantity}
 *
 * @param {Object} item - Cart item in any supported format
 * @param {number} index - Item index for error reporting
 * @returns {Object} Normalized item: {id, product: {id, name, price, seller_id}, quantity}
 * @throws {Error} If item is invalid or missing required fields
 */
export const normalizeCartItem = (item, index) => {
  if (!item || typeof item !== 'object') {
    logger.error(`[CART-NORMALIZER] Invalid cart item at index ${index} - Not an object`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: item must be an object. Received: ${JSON.stringify(item)}`);
  }

  logger.info(`[CART-NORMALIZER] Normalizing cart item ${index} - Keys: ${Object.keys(item).join(', ')}`);
  logger.info(`[CART-NORMALIZER] Item content: ${JSON.stringify(item)}`);

  // Extract item ID
  const itemId = item.id || item.cart_item_id;
  if (!itemId) {
    logger.error(`[CART-NORMALIZER] Missing item ID at index ${index}`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: missing 'id' or 'cart_item_id'. Received: ${JSON.stringify(item)}`);
  }

  // Extract quantity
  const quantity = item.quantity || 1;
  if (!quantity || quantity < 1) {
    logger.error(`[CART-NORMALIZER] Invalid quantity at index ${index} - Quantity: ${quantity}`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: quantity must be >= 1. Received: ${JSON.stringify(item)}`);
  }

  // Try to extract product info from nested structure (item.product)
  let productId = null;
  let productName = null;
  let productPrice = null;
  let sellerId = null;

  if (item.product && typeof item.product === 'object') {
    // Nested structure: item.product.id, item.product.name, etc.
    logger.info(`[CART-NORMALIZER] Extracting from nested product object at index ${index}`);
    productId = item.product.id;
    productName = item.product.name;
    productPrice = item.product.price;
    sellerId = item.product.seller_id;
  }

  // Fallback to flat structure if nested not found
  if (!productId) {
    logger.info(`[CART-NORMALIZER] Nested product not found, trying flat structure at index ${index}`);
    productId = item.product_id;
    productName = item.product_name;
    productPrice = item.product_price;
    sellerId = item.seller_id;
  }

  // Validate extracted product info
  if (!productId) {
    logger.error(`[CART-NORMALIZER] Missing product ID at index ${index}`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: missing product ID. Expected 'product.id' or 'product_id'. Received: ${JSON.stringify(item)}`);
  }

  if (!productName) {
    logger.error(`[CART-NORMALIZER] Missing product name at index ${index}`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: missing product name. Expected 'product.name' or 'product_name'. Received: ${JSON.stringify(item)}`);
  }

  if (productPrice === undefined || productPrice === null) {
    logger.error(`[CART-NORMALIZER] Missing product price at index ${index}`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: missing product price. Expected 'product.price' or 'product_price'. Received: ${JSON.stringify(item)}`);
  }

  if (!sellerId) {
    logger.error(`[CART-NORMALIZER] Missing seller ID at index ${index}`);
    logger.error(`[CART-NORMALIZER] Received: ${JSON.stringify(item)}`);
    throw new Error(`Invalid cart item at index ${index}: missing seller ID. Expected 'product.seller_id' or 'seller_id'. Received: ${JSON.stringify(item)}`);
  }

  // Normalize to unified nested structure
  const normalizedItem = {
    id: String(itemId).trim(),
    product: {
      id: String(productId).trim(),
      name: String(productName).trim(),
      price: parseFloat(productPrice),
      seller_id: String(sellerId).trim(),
    },
    quantity: parseInt(quantity, 10),
  };

  logger.info(`[CART-NORMALIZER] Cart item normalized successfully at index ${index} - Product: ${normalizedItem.product.id}, Quantity: ${normalizedItem.quantity}`);

  return normalizedItem;
};

/**
 * Normalize array of cart items
 * @param {Array} cartItems - Array of cart items in any supported format
 * @returns {Array} Array of normalized items
 * @throws {Error} If any item is invalid
 */
export const normalizeCartItems = (cartItems) => {
  if (!Array.isArray(cartItems)) {
    logger.error('[CART-NORMALIZER] cart_items is not an array');
    throw new Error('cart_items must be an array');
  }

  if (cartItems.length === 0) {
    logger.error('[CART-NORMALIZER] cart_items array is empty');
    throw new Error('cart_items cannot be empty');
  }

  logger.info(`[CART-NORMALIZER] Normalizing ${cartItems.length} cart items`);

  const normalizedItems = cartItems.map((item, index) => normalizeCartItem(item, index));

  logger.info(`[CART-NORMALIZER] All ${normalizedItems.length} cart items normalized successfully`);

  return normalizedItems;
};