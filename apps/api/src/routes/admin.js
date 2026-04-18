import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { auth, requireAuth, admin } from '../middleware/index.js';
import { DEFAULT_PLATFORM_SETTINGS, normalizePlatformSettings } from '../utils/platformSettings.js';

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(auth);
router.use(requireAuth);
router.use(admin);

// ============================================================================
// PRODUCTS ENDPOINTS
// ============================================================================

/**
 * Build filter string for product queries
 * @param {string} search - Search term (name or ID)
 * @param {string} category - Category/fachbereich filter
 * @param {string} status - Status filter
 * @returns {string} - PocketBase filter string
 */
const buildProductFilter = (search, category, status, type) => {
  const filters = [];

  if (search) {
    const searchStr = String(search).trim();
    filters.push(`(name~"${searchStr}" || id~"${searchStr}")`);
  }

  if (category) {
    const categoryStr = String(category).trim();
    filters.push(`fachbereich="${categoryStr}"`);
  }

  if (status) {
    const statusStr = String(status).trim();
    filters.push(`status="${statusStr}"`);
  }

  if (type) {
    const typeStr = String(type).trim();
    filters.push(`product_type="${typeStr}"`);
  }

  return filters.length > 0 ? filters.join(' && ') : '';
};

const queueVerificationEmail = async ({ type, sellerId, productId, productName, sellerEmail, reason = null }) => {
  const sellerIdStr = String(sellerId).trim();
  const productIdStr = String(productId).trim();
  const productNameStr = String(productName).trim();
  const sellerEmailStr = String(sellerEmail).trim();
  const reasonStr = reason ? String(reason).trim() : null;

  await pb.collection('emails').create({
    recipient: sellerEmailStr,
    type,
    sender: 'info@zahniboerse.com',
    subject: type === 'verification_approval'
      ? `Product Verified - ${productNameStr}`
      : `Product Verification Rejected - ${productNameStr}`,
    body: type === 'verification_approval'
      ? `Congratulations! Your product "${productNameStr}" has been verified and is now active on Zahnibörse. Product ID: ${productIdStr}`
      : `Unfortunately, your product "${productNameStr}" did not pass verification. Product ID: ${productIdStr}.${reasonStr ? ` Reason: ${reasonStr}` : ''}`,
    metadata: {
      seller_id: sellerIdStr,
      product_id: productIdStr,
      product_name: productNameStr,
      verification_status: type === 'verification_approval' ? 'approved' : 'rejected',
      reason: reasonStr,
    },
    status: 'pending',
  });
};

const OPTIONAL_COLLECTION_MISSING_STATUS = 404;

const escapeFilterValue = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

const compactUnique = (values) =>
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const chunkValues = (values, size = 25) => {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
};

const buildAnyEqualsFilter = (fields, values) => {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const valueList = compactUnique(Array.isArray(values) ? values : [values]);

  if (fieldList.length === 0 || valueList.length === 0) {
    return '';
  }

  return fieldList
    .flatMap((field) => valueList.map((value) => `${field}="${escapeFilterValue(value)}"`))
    .join(' || ');
};

const isMissingCollectionError = (error) =>
  error?.status === OPTIONAL_COLLECTION_MISSING_STATUS
  || error?.response?.code === OPTIONAL_COLLECTION_MISSING_STATUS
  || /collection not found|missing collection|not found/i.test(error?.message || '');

const getRecordsByFields = async (collectionName, fields, values, { optional = false } = {}) => {
  const valueList = compactUnique(Array.isArray(values) ? values : [values]);

  if (valueList.length === 0) {
    return [];
  }

  try {
    const recordGroups = [];

    for (const valueChunk of chunkValues(valueList)) {
      const filter = buildAnyEqualsFilter(fields, valueChunk);
      recordGroups.push(await pb.collection(collectionName).getFullList({
        filter,
        $autoCancel: false,
      }));
    }

    return dedupeRecords(...recordGroups);
  } catch (error) {
    if (optional && isMissingCollectionError(error)) {
      return [];
    }

    throw error;
  }
};

const dedupeRecords = (...recordGroups) => {
  const recordsById = new Map();

  for (const records of recordGroups) {
    for (const record of records || []) {
      if (record?.id) {
        recordsById.set(record.id, record);
      }
    }
  }

  return [...recordsById.values()];
};

const deleteRecords = async (collectionName, records, summary) => {
  for (const record of records) {
    try {
      await pb.collection(collectionName).delete(record.id, { $autoCancel: false });
      summary[collectionName] = (summary[collectionName] || 0) + 1;
    } catch (error) {
      if (!isMissingCollectionError(error)) {
        throw error;
      }
    }
  }
};

const metadataContainsAny = (metadata, values) => {
  const valueSet = new Set(compactUnique(values));

  if (valueSet.size === 0 || !metadata || typeof metadata !== 'object') {
    return false;
  }

  return Object.values(metadata).some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => valueSet.has(String(item || '').trim()));
    }

    return valueSet.has(String(value || '').trim());
  });
};

const getAssociatedEmails = async ({ user, productIds, orderIds }) => {
  let emailRecords = [];

  try {
    emailRecords = await pb.collection('emails').getFullList({ $autoCancel: false });
  } catch (error) {
    if (isMissingCollectionError(error)) {
      return [];
    }

    throw error;
  }

  const associatedValues = compactUnique([
    user.id,
    user.email,
    ...productIds,
    ...orderIds,
  ]);
  const userEmail = String(user.email || '').trim().toLowerCase();

  return emailRecords.filter((emailRecord) => {
    const recipient = String(emailRecord.recipient || '').trim().toLowerCase();

    return (userEmail && recipient === userEmail)
      || metadataContainsAny(emailRecord.metadata, associatedValues);
  });
};

const hardDeleteUser = async (userId, deletedByAdminId) => {
  const id = String(userId || '').trim();

  if (!id) {
    const error = new Error('User ID is required');
    error.status = 400;
    throw error;
  }

  const user = await pb.collection('users').getOne(id, { $autoCancel: false });
  const products = await getRecordsByFields('products', 'seller_id', id);
  const productIds = products.map((product) => product.id);
  const directOrders = await getRecordsByFields('orders', ['buyer_id', 'seller_id'], id);
  const productOrders = await getRecordsByFields('orders', 'product_id', productIds);
  const orders = dedupeRecords(directOrders, productOrders);
  const orderIds = orders.map((order) => order.id);
  const summary = {};

  const [
    cartItems,
    favorites,
    shippingInfo,
    productVerifications,
    returns,
    sellerEarnings,
    newsletterSignups,
    emails,
  ] = await Promise.all([
    getRecordsByFields('cart_items', ['user_id', 'product_id'], [id, ...productIds]),
    getRecordsByFields('favorites', ['user_id', 'product_id'], [id, ...productIds]),
    getRecordsByFields('shipping_info', 'user_id', id),
    getRecordsByFields('product_verifications', ['seller_id', 'product_id'], [id, ...productIds]),
    getRecordsByFields('returns', ['buyer_id', 'seller_id', 'product_id', 'order_id'], [id, ...productIds, ...orderIds]),
    getRecordsByFields('seller_earnings', ['seller_id', 'order_id'], [id, ...orderIds]),
    getRecordsByFields('newsletter_signups', 'email', user.email),
    getAssociatedEmails({ user, productIds, orderIds }),
  ]);

  await deleteRecords('cart_items', cartItems, summary);
  await deleteRecords('favorites', favorites, summary);
  await deleteRecords('shipping_info', shippingInfo, summary);
  await deleteRecords('product_verifications', productVerifications, summary);
  await deleteRecords('returns', returns, summary);
  await deleteRecords('seller_earnings', sellerEarnings, summary);
  await deleteRecords('newsletter_signups', newsletterSignups, summary);
  await deleteRecords('emails', emails, summary);
  await deleteRecords('orders', orders, summary);
  await deleteRecords('products', products, summary);
  await pb.collection('users').delete(id, { $autoCancel: false });
  summary.users = (summary.users || 0) + 1;

  logger.info(`[ADMIN] User hard deleted: ${id} by admin ${deletedByAdminId}. Summary: ${JSON.stringify(summary)}`);

  return {
    user,
    summary,
  };
};

// GET /admin/products - List all products with filters
router.get('/products', async (req, res) => {
  const { search, category, status, type } = req.query;

  logger.info(`[ADMIN] List products request - Search: ${search}, Category: ${category}, Status: ${status}, Type: ${type}`);

  if (!req.auth || !req.auth.id) {
    const error = new Error('Unauthorized: Authentication required');
    error.status = 401;
    throw error;
  }

  if (!req.auth.is_admin) {
    logger.warn(`[ADMIN] Admin access denied for user: ${req.auth.id}`);
    const error = new Error('Admin access required');
    error.status = 403;
    throw error;
  }

  const filter = buildProductFilter(search, category, status, type);

  const products = await pb.collection('products').getList(1, 500, {
    filter: filter || undefined,
    sort: '-created',
    expand: 'seller_id',
  });

  const formattedProducts = products.items.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    product_type: product.product_type || 'shop',
    condition: product.condition,
    fachbereich: product.fachbereich,
    status: product.status,
    seller_id: product.seller_id,
    seller_username: product.expand?.seller_id?.seller_username || 'Unknown',
    stock_quantity: product.stock_quantity || 0,
    image: product.image || null,
  }));

  logger.info(`[ADMIN] Fetched ${products.items.length} products`);
  res.json(formattedProducts);
});

// GET /admin/products/:id - Get single product details
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  logger.info(`[ADMIN] Get product request - ID: ${id}`);

  const product = await pb.collection('products').getOne(id);
  let seller = null;

  if (product.seller_id) {
    seller = await pb.collection('users').getOne(product.seller_id, { $autoCancel: false }).catch(() => null);
  }

  logger.info(`[ADMIN] Product retrieved - ID: ${id}`);
  res.json({
    ...product,
    seller: seller ? {
      id: seller.id,
      name: seller.name || '',
      email: seller.email || '',
      university: seller.university || '',
      seller_username: seller.seller_username || '',
      is_seller: seller.is_seller === true,
      is_admin: seller.is_admin === true,
      created: seller.created,
    } : null,
  });
});

// POST /admin/products - Create new product
router.post('/products', async (req, res) => {
  const { name, description, price, image, category, condition, stock_quantity, fachbereich, status } = req.body;

  if (!name || !description || price === undefined || !category || !condition || stock_quantity === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: name, description, price, category, condition, stock_quantity',
    });
  }

  logger.info(`[ADMIN] Create product request - Name: ${name}`);

  const formData = {
    name,
    description,
    price: parseFloat(price),
    image: image || null,
    category,
    condition,
    stock_quantity: parseInt(stock_quantity, 10),
    fachbereich: fachbereich || category,
    status: status || 'active',
    created_at: new Date().toISOString(),
  };

  const product = await pb.collection('products').create(formData);

  logger.info(`[ADMIN] Product created - ID: ${product.id}`);
  res.json(product);
});

// PUT /admin/products/:id - Update product
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image, category, condition, stock_quantity, fachbereich, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  logger.info(`[ADMIN] Update product request - ID: ${id}`);

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (price !== undefined) updateData.price = parseFloat(price);
  if (image !== undefined) updateData.image = image;
  if (category !== undefined) updateData.category = category;
  if (condition !== undefined) updateData.condition = condition;
  if (stock_quantity !== undefined) updateData.stock_quantity = parseInt(stock_quantity, 10);
  if (fachbereich !== undefined) updateData.fachbereich = fachbereich;
  if (status !== undefined) updateData.status = status;

  const product = await pb.collection('products').update(id, updateData);

  logger.info(`[ADMIN] Product updated - ID: ${id}`);
  res.json(product);
});

// DELETE /admin/products/:id - Delete product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  logger.info(`[ADMIN] Delete product request - ID: ${id}`);

  await pb.collection('products').delete(id);

  logger.info(`[ADMIN] Product deleted - ID: ${id}`);
  res.json({ success: true, message: `Product ${id} deleted successfully` });
});

// PUT /admin/products/:id/stock - Update product stock
router.put('/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  logger.info(`[ADMIN] Update stock request - ID: ${id}, Quantity: ${quantity}`);

  const product = await pb.collection('products').update(id, { stock_quantity: parseInt(quantity, 10) });

  logger.info(`[ADMIN] Product stock updated - ID: ${id}, Quantity: ${quantity}`);
  res.json(product);
});

// Backward compatible stock update route for older clients.
router.post('/products/:id/stock', async (req, res) => {
  req.method = 'PUT';
  return router.handle(req, res);
});

router.put('/products/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowedStatuses = ['draft', 'active', 'pending_verification', 'rejected', 'sold'];

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
    });
  }

  const product = await pb.collection('products').update(id, { status });

  logger.info(`[ADMIN] Product status updated - ID: ${id}, Status: ${status}`);
  res.json(product);
});

// Soft Delete Product
router.put('/products/:id/delete', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  let product;

  try {
    product = await pb.collection('shop_products').update(id, { is_deleted: true });
  } catch (error) {
    product = await pb.collection('products').update(id, { is_deleted: true });
  }

  logger.info(`[ADMIN] Product soft deleted: ${id} by admin ${req.auth.id}`);
  res.json({ success: true, message: `Product ${id} has been deleted` });
});

// ============================================================================
// PRODUCT VERIFICATION ENDPOINTS
// ============================================================================

// GET /admin/verifications - List products awaiting admin verification
router.get('/verifications', async (req, res) => {
  logger.info(`[ADMIN] List pending verifications request - Admin: ${req.auth.id}`);

  const products = await pb.collection('products').getList(1, 100, {
    filter: 'status="pending_verification"',
    sort: '-created',
  });

  const sellerIds = [...new Set(products.items.map((product) => product.seller_id).filter(Boolean))];
  const sellersById = {};

  if (sellerIds.length > 0) {
    const sellerFilter = sellerIds.map((sellerId) => `id="${String(sellerId)}"`).join(' || ');
    const sellers = await pb.collection('users').getFullList({
      filter: sellerFilter,
    });

    for (const seller of sellers) {
      sellersById[seller.id] = {
        id: seller.id,
        name: seller.name || '',
        email: seller.email || '',
        seller_username: seller.seller_username || '',
      };
    }
  }

  const items = products.items.map((product) => {
    const seller = sellersById[product.seller_id] || {};

    return {
      id: product.id,
      collectionId: product.collectionId,
      collectionName: product.collectionName,
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      image: product.image || '',
      condition: product.condition || '',
      fachbereich: product.fachbereich || [],
      product_type: product.product_type || '',
      seller_id: product.seller_id || '',
      seller_username: product.seller_username || seller.seller_username || seller.name || '',
      seller_email: seller.email || '',
      status: product.status || '',
      created: product.created,
      updated: product.updated,
    };
  });

  logger.info(`[ADMIN] Fetched ${items.length} products awaiting verification`);
  res.json({
    items,
    total: products.totalItems,
    page: products.page,
    perPage: products.perPage,
    totalPages: products.totalPages,
  });
});

// POST /admin/approve-product
router.post('/approve-product', async (req, res) => {
  const { productId } = req.body;
  const adminId = req.auth.id;

  logger.info(`[ADMIN] Approve product request - Product: ${productId}, Admin: ${adminId}`);

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const productIdStr = String(productId);

  const product = await pb.collection('products').getOne(productIdStr);

  if (!product) {
    return res.status(404).json({ error: `Product ${productIdStr} not found` });
  }

  await pb.collection('products').update(productIdStr, {
    status: 'active',
    verification_status: 'approved',
  });

  logger.info(`[ADMIN] Product approved - Product: ${productIdStr}, Admin: ${adminId}`);

  const seller = await pb.collection('users').getOne(product.seller_id);

  try {
    await queueVerificationEmail({
      type: 'verification_approval',
      sellerId: product.seller_id,
      productId: productIdStr,
      productName: product.name,
      sellerEmail: seller.email,
    });

    logger.info(`[ADMIN] Approval email queued for seller - Seller: ${product.seller_id}`);
  } catch (emailError) {
    logger.warn(`[ADMIN] Approval email failed - Seller: ${product.seller_id}, Error: ${emailError.message}`);
  }

  res.json({
    success: true,
    productId: productIdStr,
    status: 'active',
    verification_status: 'approved',
    message: `Product ${productIdStr} has been approved`,
  });
});

// POST /admin/reject-product
router.post('/reject-product', async (req, res) => {
  const { productId, reason } = req.body;
  const adminId = req.auth.id;

  logger.info(`[ADMIN] Reject product request - Product: ${productId}, Admin: ${adminId}`);

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const productIdStr = String(productId);

  const product = await pb.collection('products').getOne(productIdStr);

  if (!product) {
    return res.status(404).json({ error: `Product ${productIdStr} not found` });
  }

  const seller = await pb.collection('users').getOne(product.seller_id);

  await pb.collection('products').update(productIdStr, {
    verification_status: 'rejected',
  }).catch(() => null);

  await pb.collection('products').delete(productIdStr);

  logger.info(`[ADMIN] Product rejected and deleted - Product: ${productIdStr}, Admin: ${adminId}`);

  try {
    await queueVerificationEmail({
      type: 'verification_rejection',
      sellerId: product.seller_id,
      productId: productIdStr,
      productName: product.name,
      sellerEmail: seller.email,
      reason: reason || 'Product does not meet verification requirements',
    });

    logger.info(`[ADMIN] Rejection email queued for seller - Seller: ${product.seller_id}`);
  } catch (emailError) {
    logger.warn(`[ADMIN] Rejection email failed - Seller: ${product.seller_id}, Error: ${emailError.message}`);
  }

  res.json({
    success: true,
    productId: productIdStr,
    message: `Product ${productIdStr} has been rejected and deleted`,
  });
});

// ============================================================================
// ORDERS ENDPOINTS
// ============================================================================

// Get Orders with Filters
router.get('/orders', async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  let filter = '';

  if (status) {
    const statusStr = String(status).trim();
    filter = `status="${statusStr}"`;
  }

  if (startDate) {
    const startDateStr = String(startDate).trim();
    const dateFilter = `created_at>="${startDateStr}T00:00:00Z"`;
    filter = filter ? `${filter} && ${dateFilter}` : dateFilter;
  }

  if (endDate) {
    const endDateStr = String(endDate).trim();
    const dateFilter = `created_at<="${endDateStr}T23:59:59Z"`;
    filter = filter ? `${filter} && ${dateFilter}` : dateFilter;
  }

  const orders = await pb.collection('orders').getList(pageNum, limitNum, {
    filter: filter || undefined,
    sort: '-created_at',
  });

  logger.info(`[ADMIN] Fetched ${orders.items.length} orders by admin ${req.auth.id}`);
  res.json({
    items: orders.items,
    total: orders.totalItems,
    page: pageNum,
    limit: limitNum,
  });
});

// Update Order Status
router.put('/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  if (!status || !['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Must be one of: pending, paid, shipped, delivered, cancelled',
    });
  }

  const order = await pb.collection('orders').update(id, { status });

  logger.info(`[ADMIN] Order ${id} status updated to ${status} by admin ${req.auth.id}`);
  res.json(order);
});

// ============================================================================
// USERS ENDPOINTS
// ============================================================================

// Get Users with Filters
router.get('/users', async (req, res) => {
  const { search, role, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  let filter = '';

  if (role) {
    const roleStr = String(role).trim();
    filter = `role="${roleStr}"`;
  }

  if (search) {
    const searchStr = String(search).trim();
    const searchFilter = `(email~"${searchStr}" || name~"${searchStr}")`;
    filter = filter ? `${filter} && ${searchFilter}` : searchFilter;
  }

  const users = await pb.collection('users').getList(pageNum, limitNum, {
    filter: filter || undefined,
    sort: '-created',
  });

  logger.info(`[ADMIN] Fetched ${users.items.length} users by admin ${req.auth.id}`);
  res.json({
    items: users.items,
    total: users.totalItems,
    page: pageNum,
    limit: limitNum,
  });
});

const handleHardDeleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const { summary } = await hardDeleteUser(id, req.auth.id);

  res.json({
    success: true,
    hardDeleted: true,
    deletedUserId: id,
    deletedRecords: summary,
    message: `User ${id} and associated records have been permanently deleted`,
  });
};

// Hard Delete User
router.delete('/users/:id', handleHardDeleteUser);

// Backward compatible user delete route for older clients.
router.put('/users/:id/delete', handleHardDeleteUser);

// Remove Seller Status from User
router.put('/users/:id/remove-seller', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  await pb.collection('users').update(id, { is_seller: false });

  logger.info(`[ADMIN] Seller status removed for user: ${id} by admin ${req.auth.id}`);
  res.json({ success: true, message: `Seller status removed for user ${id}` });
});

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

// Get Admin Settings
router.get('/settings', async (req, res) => {
  const settings = await pb.collection('admin_settings').getFirstListItem('');

  logger.info(`[ADMIN] Admin settings retrieved by admin ${req.auth.id}`);
  res.json(settings);
});

// Update Admin Settings
router.put('/settings', async (req, res) => {
  const {
    shipping_fee,
    service_fee,
    transaction_fee_percentage,
    transaction_fee_percent,
    verification_fee,
    dhl_api_key,
    dhl_api_secret,
    stripe_public_key,
    stripe_secret_key,
  } = req.body;

  const updateData = {};
  if (shipping_fee !== undefined) updateData.shipping_fee = parseFloat(shipping_fee);
  if (service_fee !== undefined) updateData.service_fee = parseFloat(service_fee);
  if (transaction_fee_percentage !== undefined) updateData.transaction_fee_percentage = parseFloat(transaction_fee_percentage);
  if (transaction_fee_percent !== undefined) updateData.transaction_fee_percentage = parseFloat(transaction_fee_percent);
  if (verification_fee !== undefined) updateData.verification_fee = parseFloat(verification_fee);
  if (dhl_api_key !== undefined) updateData.dhl_api_key = dhl_api_key;
  if (dhl_api_secret !== undefined) updateData.dhl_api_secret = dhl_api_secret;
  if (stripe_public_key !== undefined) updateData.stripe_public_key = stripe_public_key;
  if (stripe_secret_key !== undefined) updateData.stripe_secret_key = stripe_secret_key;

  let settings;
  try {
    const existingSettings = await pb.collection('admin_settings').getFirstListItem('');
    settings = await pb.collection('admin_settings').update(existingSettings.id, updateData);
  } catch (error) {
    const defaults = normalizePlatformSettings({
      ...DEFAULT_PLATFORM_SETTINGS,
      ...updateData,
    });

    settings = await pb.collection('admin_settings').create({
      shipping_fee: defaults.shipping_fee,
      service_fee: defaults.service_fee,
      transaction_fee_percentage: defaults.transaction_fee_percentage,
      verification_fee: defaults.verification_fee,
      dhl_api_key: updateData.dhl_api_key || '',
      dhl_api_secret: updateData.dhl_api_secret || '',
      stripe_public_key: updateData.stripe_public_key || '',
      stripe_secret_key: updateData.stripe_secret_key || '',
    });
  }

  logger.info(`[ADMIN] Admin settings updated by admin ${req.auth.id}`);
  res.json(settings);
});

export default router;
