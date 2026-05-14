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

const buildShopProductFilter = (search, category) => {
  const filters = [];

  if (search) {
    const searchStr = escapeFilterValue(String(search).trim());
    filters.push(`(name~"${searchStr}" || id~"${searchStr}")`);
  }

  if (category) {
    filters.push(`fachbereich="${escapeFilterValue(String(category).trim())}"`);
  }

  return filters.length > 0 ? filters.join(' && ') : '';
};

const PLATFORM_SELLER = {
  id: 'platform',
  name: 'Zahnibörse',
  email: 'info@zahniboerse.com',
  university: 'Official shop',
  seller_username: 'Zahnibörse',
  is_seller: true,
  is_admin: true,
};

const buildAdminProductSeller = (product, source = 'marketplace', seller = null) => {
  const productDate = product.created || product.created_at || product.updated || '';

  if (source === 'shop') {
    return {
      ...PLATFORM_SELLER,
      created: productDate,
    };
  }

  const resolvedSeller = seller || product.expand?.seller_id || null;

  if (resolvedSeller) {
    return {
      id: resolvedSeller.id || product.seller_id || 'unknown',
      name: resolvedSeller.name || resolvedSeller.seller_username || product.seller_username || 'Unknown seller',
      email: resolvedSeller.email || 'Not available',
      university: resolvedSeller.university || 'Not available',
      seller_username: resolvedSeller.seller_username || product.seller_username || resolvedSeller.name || 'Unknown seller',
      is_seller: resolvedSeller.is_seller === true,
      is_admin: resolvedSeller.is_admin === true,
      created: resolvedSeller.created || productDate,
    };
  }

  return {
    id: product.seller_id || 'unknown',
    name: product.seller_username || 'Unknown seller',
    email: 'Not available',
    university: 'Not available',
    seller_username: product.seller_username || 'Unknown seller',
    is_seller: false,
    is_admin: false,
    created: productDate,
  };
};

const resolveProductVerificationStatus = (product, source) => {
  if (source === 'shop') return 'approved';
  if (product.verification_status) return product.verification_status;
  if (product.status === 'active') return 'approved';
  if (product.status === 'pending_verification') return 'pending';
  return 'not_required';
};

const formatAdminProduct = (product, source = 'marketplace', seller = null) => {
  const normalizedSeller = buildAdminProductSeller(product, source, seller);
  const createdAt = product.created_at || product.created || '';
  const updatedAt = product.updated_at || product.updated || createdAt;

  return {
    id: product.id,
    collectionId: product.collectionId,
    collectionName: product.collectionName,
    source,
    name: product.name || '',
    description: product.description || '',
    price: product.price || 0,
    product_type: product.product_type || 'Article',
    condition: product.condition || 'Not specified',
    fachbereich: product.fachbereich || [],
    status: source === 'shop' ? 'active' : product.status || 'draft',
    verification_status: resolveProductVerificationStatus(product, source),
    seller_id: normalizedSeller.id,
    seller_username: normalizedSeller.seller_username,
    seller_email: normalizedSeller.email,
    seller: normalizedSeller,
    stock_quantity: product.stock_quantity || 0,
    weight_g: product.weight_g || 0,
    length_mm: product.length_mm || 0,
    width_mm: product.width_mm || 0,
    height_mm: product.height_mm || 0,
    image: product.image || null,
    shop_product: source === 'shop' ? true : product.shop_product === true,
    created: product.created || createdAt,
    created_at: createdAt,
    updated: product.updated || updatedAt,
    updated_at: updatedAt,
    set_items: product.set_items || [],
  };
};

const resolveAdminProduct = async (id, preferredSource = null) => {
  const collections = preferredSource === 'shop'
    ? ['shop_products', 'products']
    : preferredSource === 'marketplace'
      ? ['products', 'shop_products']
      : ['shop_products', 'products'];

  for (const collectionName of collections) {
    const product = await pb.collection(collectionName).getOne(id, { $autoCancel: false }).catch(() => null);
    if (product) {
      return {
        product,
        collectionName,
        source: collectionName === 'shop_products' ? 'shop' : 'marketplace',
      };
    }
  }

  return null;
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
const PRODUCT_COLLECTION_BY_TYPE = {
  marketplace: 'products',
  shop: 'shop_products',
};

const escapeFilterValue = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"');

const parseParcelNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
};

const parseAddress = (rawAddress) => {
  if (!rawAddress) return {};
  if (typeof rawAddress === 'object') return rawAddress;

  try {
    return JSON.parse(rawAddress);
  } catch {
    return {};
  }
};

const sanitizeUserSummary = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    seller_username: user.seller_username || '',
    university: user.university || '',
  };
};

const sanitizeProductSummary = (product) => {
  if (!product) return null;

  return {
    id: product.id,
    collectionId: product.collectionId,
    collectionName: product.collectionName,
    name: product.name || '',
    price: product.price || 0,
    image: product.image || '',
    condition: product.condition || '',
    product_type: product.product_type || '',
    fachbereich: product.fachbereich || [],
    seller_id: product.seller_id || '',
    seller_username: product.seller_username || '',
    weight_g: product.weight_g || 0,
  };
};

const sanitizeAdminOrderRecord = (order) => {
  if (!order) return null;

  const {
    dhl_label_pdf,
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
  const preferredCollection = PRODUCT_COLLECTION_BY_TYPE[order.product_type] || 'products';
  const fallbackCollection = preferredCollection === 'products' ? 'shop_products' : 'products';

  try {
    return await pb.collection(preferredCollection).getOne(productId);
  } catch (preferredError) {
    logger.warn(`[ADMIN] Product lookup failed in ${preferredCollection} - Product: ${productId}, Error: ${preferredError.message}`);
  }

  try {
    return await pb.collection(fallbackCollection).getOne(productId);
  } catch (fallbackError) {
    logger.warn(`[ADMIN] Product lookup failed in ${fallbackCollection} - Product: ${productId}, Error: ${fallbackError.message}`);
    return null;
  }
};

const fetchLatestReturnRequest = async (orderId) => {
  const items = await pb.collection('returns').getFullList({
    filter: `order_id="${escapeFilterValue(orderId)}"`,
    sort: '-created',
  }).catch(() => []);

  return items[0] || null;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const buildRecentDateBuckets = (days) => {
  const bucketCount = Math.min(Math.max(Number.parseInt(days, 10) || 7, 1), 31);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return [...Array(bucketCount)].map((_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (bucketCount - 1 - index));
    return {
      date: toDateKey(date),
      orders: 0,
      revenue: 0,
    };
  });
};

const buildAdminAnalyticsResponse = async ({ days = 7 } = {}) => {
  const [
    orders,
    users,
    marketplaceProducts,
    shopProducts,
    sellerEarnings,
  ] = await Promise.all([
    pb.collection('orders').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch(() => []),
    pb.collection('users').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch(() => []),
    pb.collection('products').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch(() => []),
    pb.collection('shop_products').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
    pb.collection('seller_earnings').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
  ]);

  const dateBuckets = buildRecentDateBuckets(days);
  const dateBucketByKey = new Map(dateBuckets.map((bucket) => [bucket.date, bucket]));

  for (const order of orders) {
    const created = order.created || order.created_at;
    if (!created) continue;

    const createdDate = new Date(created);
    if (Number.isNaN(createdDate.getTime())) continue;

    const dateKey = toDateKey(createdDate);
    const bucket = dateBucketByKey.get(dateKey);
    if (!bucket) continue;

    bucket.orders += 1;

    if (!['cancelled'].includes(order.status)) {
      bucket.revenue += Number(order.total_amount) || 0;
    }
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  const productsBySeller = new Map();
  const ordersBySeller = new Map();
  const revenueBySeller = new Map();
  const earningsBySeller = new Map();

  for (const product of [...marketplaceProducts, ...shopProducts]) {
    const sellerId = String(product.seller_id || '').trim();
    if (!sellerId) continue;
    productsBySeller.set(sellerId, (productsBySeller.get(sellerId) || 0) + 1);
  }

  for (const order of orders) {
    const sellerId = String(order.seller_id || '').trim();
    if (!sellerId) continue;

    ordersBySeller.set(sellerId, (ordersBySeller.get(sellerId) || 0) + 1);

    if (!['cancelled'].includes(order.status)) {
      revenueBySeller.set(sellerId, (revenueBySeller.get(sellerId) || 0) + (Number(order.total_amount) || 0));
    }
  }

  for (const earning of sellerEarnings) {
    const sellerId = String(earning.seller_id || '').trim();
    if (!sellerId) continue;
    earningsBySeller.set(sellerId, (earningsBySeller.get(sellerId) || 0) + (Number(earning.net_amount ?? earning.gross_amount) || 0));
  }

  const sellerIds = compactUnique([
    ...users.filter((user) => user.is_seller === true).map((user) => user.id),
    ...productsBySeller.keys(),
    ...ordersBySeller.keys(),
    ...earningsBySeller.keys(),
  ]);

  const topSellers = sellerIds
    .map((sellerId) => {
      const seller = usersById.get(sellerId);

      return {
        id: sellerId,
        name: seller?.name || '',
        email: seller?.email || '',
        seller_username: seller?.seller_username || '',
        product_count: productsBySeller.get(sellerId) || 0,
        order_count: ordersBySeller.get(sellerId) || 0,
        revenue_total: revenueBySeller.get(sellerId) || 0,
        earnings_total: earningsBySeller.get(sellerId) || 0,
      };
    })
    .sort((a, b) => (
      (b.revenue_total - a.revenue_total)
      || (b.order_count - a.order_count)
      || (b.product_count - a.product_count)
      || String(a.seller_username || a.name || a.id).localeCompare(String(b.seller_username || b.name || b.id))
    ))
    .slice(0, 5);

  return {
    orderVolume: dateBuckets,
    topSellers,
    summary: {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => (
        order.status === 'cancelled' ? sum : sum + (Number(order.total_amount) || 0)
      ), 0),
      totalProducts: marketplaceProducts.length + shopProducts.length,
      totalSellers: sellerIds.length,
    },
    fetchedAt: new Date().toISOString(),
  };
};

const buildAdminOrderResponse = async (order) => {
  const [buyer, seller, product, latestReturnRequest] = await Promise.all([
    order.buyer_id ? pb.collection('users').getOne(String(order.buyer_id)).catch(() => null) : Promise.resolve(null),
    order.seller_id ? pb.collection('users').getOne(String(order.seller_id)).catch(() => null) : Promise.resolve(null),
    fetchOrderProduct(order),
    fetchLatestReturnRequest(order.id),
  ]);

  return {
    ...sanitizeAdminOrderRecord(order),
    buyer: sanitizeUserSummary(buyer),
    seller: sanitizeUserSummary(seller),
    product: sanitizeProductSummary(product),
    has_label: !!(order.dhl_label_pdf || order.dhl_label_url),
    tracking_number: order.tracking_number || order.dhl_tracking_number || '',
    shipping_address_parsed: parseAddress(order.shipping_address),
    return_request: sanitizeReturnRequest(latestReturnRequest),
  };
};

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

// GET /admin/dashboard - Aggregate admin overview data for the dashboard page
router.get('/dashboard', async (req, res) => {
  logger.info(`[ADMIN] Dashboard overview request - Admin: ${req.auth.id}`);

  const [
    orders,
    marketplaceProducts,
    shopProducts,
    users,
    returns,
    sellerEarnings,
    settings,
  ] = await Promise.all([
    pb.collection('orders').getFullList({
      sort: '-created',
      expand: 'buyer_id,seller_id,product_id',
      $autoCancel: false,
    }),
    pb.collection('products').getFullList({
      sort: '-created',
      expand: 'seller_id',
      $autoCancel: false,
    }),
    pb.collection('shop_products').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
    pb.collection('users').getFullList({
      sort: '-created',
      $autoCancel: false,
    }),
    pb.collection('returns').getFullList({
      sort: '-created',
      expand: 'order_id,buyer_id',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
    pb.collection('seller_earnings').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
    pb.collection('admin_settings').getFirstListItem('', {
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error) || error?.status === 404) {
        return null;
      }

      throw error;
    }),
  ]);

  const enrichedOrders = await Promise.all(orders.map((order) => buildAdminOrderResponse(order)));
  const products = [
    ...marketplaceProducts.map((product) => formatAdminProduct(product, 'marketplace')),
    ...shopProducts.map((product) => formatAdminProduct(product, 'shop')),
  ].sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));

  res.json({
    orders: enrichedOrders,
    products,
    users,
    returns,
    sellerEarnings,
    settings,
    fetchedAt: new Date().toISOString(),
  });
});

// GET /admin/analytics - Dedicated analytics payload for the admin analytics tab
router.get('/analytics', async (req, res) => {
  const days = req.query.days || 7;

  logger.info(`[ADMIN] Analytics request - Admin: ${req.auth.id}, Days: ${days}`);

  const analytics = await buildAdminAnalyticsResponse({ days });

  res.json(analytics);
});

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

  const marketplaceFilter = buildProductFilter(search, category, status, type);
  const shouldIncludeShopProducts = !type || type === 'shop';
  const shopFilter = shouldIncludeShopProducts ? buildShopProductFilter(search, category) : null;

  const [marketplaceProducts, shopProducts] = await Promise.all([
    pb.collection('products').getFullList({
      filter: marketplaceFilter || undefined,
      sort: '-created',
      expand: 'seller_id',
      $autoCancel: false,
    }),
    shouldIncludeShopProducts
      ? pb.collection('shop_products').getFullList({
          filter: shopFilter || undefined,
          sort: '-created',
          $autoCancel: false,
        }).catch((error) => {
          if (isMissingCollectionError(error)) {
            return [];
          }

          throw error;
        })
      : Promise.resolve([]),
  ]);

  const formattedProducts = [
    ...marketplaceProducts.map((product) => formatAdminProduct(product, 'marketplace')),
    ...shopProducts.map((product) => formatAdminProduct(product, 'shop')),
  ].sort((a, b) => String(b.created || '').localeCompare(String(a.created || ''))).slice(0, 500);

  logger.info(`[ADMIN] Fetched ${formattedProducts.length} products`);
  res.json(formattedProducts);
});

// GET /admin/products/:id - Get single product details
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  logger.info(`[ADMIN] Get product request - ID: ${id}`);

  const resolved = await resolveAdminProduct(id, req.query.source);

  if (!resolved) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { product, source } = resolved;
  let seller = null;

  if (product.seller_id) {
    seller = await pb.collection('users').getOne(product.seller_id, { $autoCancel: false }).catch(() => null);
  }

  logger.info(`[ADMIN] Product retrieved - ID: ${id}`);
  res.json(formatAdminProduct(product, source, seller));
});

// POST /admin/products - Create new product
router.post('/products', async (req, res) => {
  const { name, description, price, image, category, condition, fachbereich, stock_quantity, weight_g, length_mm, width_mm, height_mm } = req.body;
  const parcelWeight = parseParcelNumber(weight_g);

  if (!name || price === undefined || !(category || fachbereich) || !condition || !parcelWeight) {
    return res.status(400).json({
      error: 'Missing required fields: name, price, category/fachbereich, condition, weight_g',
    });
  }

  logger.info(`[ADMIN] Create product request - Name: ${name}`);

  const formData = {
    name,
    description: description || '',
    price: parseFloat(price),
    image: image || null,
    condition,
    fachbereich: fachbereich || category,
    stock_quantity: parseParcelNumber(stock_quantity) ?? 1,
    weight_g: parcelWeight,
    created_at: new Date().toISOString(),
  };

  const parcelDimensions = {
    length_mm: parseParcelNumber(length_mm),
    width_mm: parseParcelNumber(width_mm),
    height_mm: parseParcelNumber(height_mm),
  };

  for (const [field, value] of Object.entries(parcelDimensions)) {
    if (value !== undefined) formData[field] = value;
  }

  const product = await pb.collection('shop_products').create(formData);

  logger.info(`[ADMIN] Official shop product created - ID: ${product.id}`);
  res.json(formatAdminProduct(product, 'shop'));
});

// PUT /admin/products/:id - Update product
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image, category, condition, stock_quantity, fachbereich, status, weight_g, length_mm, width_mm, height_mm } = req.body;

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
  const stockQuantity = parseParcelNumber(stock_quantity);
  const parcelWeight = parseParcelNumber(weight_g);
  const parcelLength = parseParcelNumber(length_mm);
  const parcelWidth = parseParcelNumber(width_mm);
  const parcelHeight = parseParcelNumber(height_mm);

  if (stock_quantity !== undefined && stockQuantity !== undefined) updateData.stock_quantity = stockQuantity;
  if (weight_g !== undefined && parcelWeight !== undefined) updateData.weight_g = parcelWeight;
  if (length_mm !== undefined && parcelLength !== undefined) updateData.length_mm = parcelLength;
  if (width_mm !== undefined && parcelWidth !== undefined) updateData.width_mm = parcelWidth;
  if (height_mm !== undefined && parcelHeight !== undefined) updateData.height_mm = parcelHeight;
  if (fachbereich !== undefined) updateData.fachbereich = fachbereich;
  if (status !== undefined) updateData.status = status;

  const resolved = await resolveAdminProduct(id, req.query.source || req.body.source);

  if (!resolved) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (resolved.source === 'shop') {
    delete updateData.category;
    delete updateData.status;
    delete updateData.product_type;
  }

  const product = await pb.collection(resolved.collectionName).update(id, updateData);

  logger.info(`[ADMIN] Product updated - ID: ${id}`);
  res.json(formatAdminProduct(product, resolved.source));
});

// DELETE /admin/products/:id - Delete product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  logger.info(`[ADMIN] Delete product request - ID: ${id}`);

  const resolved = await resolveAdminProduct(id, req.query.source);

  if (!resolved) {
    return res.status(404).json({ error: 'Product not found' });
  }

  await pb.collection(resolved.collectionName).delete(id);

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

  const resolved = await resolveAdminProduct(id, req.query.source || req.body.source);

  if (!resolved) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (resolved.source === 'shop') {
    logger.info(`[ADMIN] Stock update skipped for official shop product without stock field - ID: ${id}`);
    return res.json(formatAdminProduct(resolved.product, resolved.source));
  }

  const product = await pb.collection('products').update(id, { stock_quantity: parseInt(quantity, 10) });

  logger.info(`[ADMIN] Product stock updated - ID: ${id}, Quantity: ${quantity}`);
  res.json(formatAdminProduct(product, resolved.source));
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

  const resolved = await resolveAdminProduct(id, req.query.source || req.body.source);

  if (!resolved) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (resolved.source === 'shop') {
    if (status !== 'active') {
      return res.status(400).json({ error: 'Official shop products do not support marketplace status changes' });
    }

    return res.json(formatAdminProduct(resolved.product, resolved.source));
  }

  const product = await pb.collection('products').update(id, { status });

  logger.info(`[ADMIN] Product status updated - ID: ${id}, Status: ${status}`);
  res.json(formatAdminProduct(product, resolved.source));
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
  const enrichedOrders = await Promise.all(orders.items.map((order) => buildAdminOrderResponse(order)));

  logger.info(`[ADMIN] Fetched ${orders.items.length} orders by admin ${req.auth.id}`);
  res.json({
    items: enrichedOrders,
    total: orders.totalItems,
    page: pageNum,
    limit: limitNum,
  });
});

// Download Order Label PDF
router.get('/orders/:id/label-pdf', async (req, res) => {
  const orderId = String(req.params.id || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.dhl_label_pdf) {
    const fileName = `DHL_Label_${order.order_number || order.id}.pdf`;
    const pdfBuffer = Buffer.from(String(order.dhl_label_pdf), 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(pdfBuffer);
  }

  if (order.dhl_label_url) {
    return res.json({
      label_url: order.dhl_label_url,
    });
  }

  return res.status(404).json({ error: 'No DHL label available for this order' });
});

// Get Order Details
router.get('/orders/:id', async (req, res) => {
  const orderId = String(req.params.id || '').trim();

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const order = await pb.collection('orders').getOne(orderId).catch(() => null);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const item = await buildAdminOrderResponse(order);

  logger.info(`[ADMIN] Fetched order ${orderId} details by admin ${req.auth.id}`);
  res.json(item);
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

  const orderId = String(id).trim();
  const existingOrder = await pb.collection('orders').getOne(orderId).catch(() => null);

  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = await pb.collection('orders').update(orderId, { status });

  if (status === 'delivered') {
    const earnings = await pb.collection('seller_earnings').getFullList({
      filter: `order_id="${escapeFilterValue(orderId)}"`,
    }).catch(() => []);

    await Promise.all(
      earnings
        .filter((earning) => earning.status !== 'confirmed')
        .map((earning) => pb.collection('seller_earnings').update(earning.id, { status: 'confirmed' })),
    );
  }

  const enrichedOrder = await buildAdminOrderResponse(order);

  logger.info(`[ADMIN] Order ${orderId} status updated to ${status} by admin ${req.auth.id}`);
  res.json({
    success: true,
    message: `Order ${orderId} status updated to ${status}`,
    order: enrichedOrder,
  });
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

// Get Sellers with Aggregates
router.get('/sellers', async (req, res) => {
  const { search, page = 1, limit = 100 } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 100;

  const normalizedSearch = String(search || '').trim().toLowerCase();

  const [
    allUsers,
    marketplaceProducts,
    shopProducts,
    allOrders,
    sellerEarnings,
  ] = await Promise.all([
    pb.collection('users').getFullList({
      sort: '-created',
      $autoCancel: false,
    }),
    pb.collection('products').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch(() => []),
    pb.collection('shop_products').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
    pb.collection('orders').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch(() => []),
    pb.collection('seller_earnings').getFullList({
      sort: '-created',
      $autoCancel: false,
    }).catch((error) => {
      if (isMissingCollectionError(error)) {
        return [];
      }

      throw error;
    }),
  ]);

  const filteredSellers = allUsers.filter((user) => {
    if (user.is_seller !== true) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      user.email,
      user.name,
      user.seller_username,
    ].map((value) => String(value || '').toLowerCase());

    return haystack.some((value) => value.includes(normalizedSearch));
  });

  const totalItems = filteredSellers.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limitNum);
  const startIndex = Math.max(0, (pageNum - 1) * limitNum);
  const pagedSellers = filteredSellers.slice(startIndex, startIndex + limitNum);
  const sellerIds = filteredSellers.map((seller) => seller.id);
  const sellerIdSet = new Set(sellerIds);

  const productCountBySeller = new Map();
  const activeListingCountBySeller = new Map();
  const orderCountBySeller = new Map();
  const deliveredOrderCountBySeller = new Map();
  const revenueTotalBySeller = new Map();
  const availableBalanceBySeller = new Map();

  for (const product of [...marketplaceProducts, ...shopProducts]) {
    const sellerId = String(product.seller_id || '').trim();
    if (!sellerId) continue;

    productCountBySeller.set(sellerId, (productCountBySeller.get(sellerId) || 0) + 1);

    if (['active', 'verified'].includes(product.status)) {
      activeListingCountBySeller.set(sellerId, (activeListingCountBySeller.get(sellerId) || 0) + 1);
    }
  }

  for (const order of allOrders) {
    const sellerId = String(order.seller_id || '').trim();
    if (!sellerId || !sellerIdSet.has(sellerId)) continue;

    orderCountBySeller.set(sellerId, (orderCountBySeller.get(sellerId) || 0) + 1);

    if (['delivered', 'completed'].includes(order.status)) {
      deliveredOrderCountBySeller.set(sellerId, (deliveredOrderCountBySeller.get(sellerId) || 0) + 1);
    }
  }

  for (const earning of sellerEarnings) {
    const sellerId = String(earning.seller_id || '').trim();
    if (!sellerId) continue;

    const netAmount = Number(earning.net_amount ?? earning.gross_amount) || 0;
    revenueTotalBySeller.set(sellerId, (revenueTotalBySeller.get(sellerId) || 0) + netAmount);

    if (earning.status === 'confirmed') {
      availableBalanceBySeller.set(sellerId, (availableBalanceBySeller.get(sellerId) || 0) + netAmount);
    }
  }

  const items = pagedSellers.map((seller) => {
    const sellerId = seller.id;

    return {
      id: sellerId,
      user_id: seller.user_id || '',
      name: seller.name || '',
      email: seller.email || '',
      seller_username: seller.seller_username || '',
      university: seller.university || '',
      created: seller.created,
      is_seller: seller.is_seller === true,
      is_deleted: seller.is_deleted === true,
      is_admin: seller.is_admin === true,
      product_count: productCountBySeller.get(sellerId) || 0,
      active_listings_count: activeListingCountBySeller.get(sellerId) || 0,
      order_count: orderCountBySeller.get(sellerId) || 0,
      delivered_order_count: deliveredOrderCountBySeller.get(sellerId) || 0,
      revenue_total: revenueTotalBySeller.get(sellerId) || 0,
      available_balance: availableBalanceBySeller.get(sellerId) || 0,
      status: seller.is_deleted ? 'deleted' : 'active',
    };
  });

  const summary = filteredSellers.reduce((acc, seller) => {
    const sellerId = seller.id;

    acc.totalSellers += 1;
    acc.totalListings += productCountBySeller.get(sellerId) || 0;
    acc.activeListings += activeListingCountBySeller.get(sellerId) || 0;
    acc.totalOrders += orderCountBySeller.get(sellerId) || 0;
    acc.availableBalance += availableBalanceBySeller.get(sellerId) || 0;
    acc.revenueTotal += revenueTotalBySeller.get(sellerId) || 0;
    return acc;
  }, {
    totalSellers: 0,
    totalListings: 0,
    activeListings: 0,
    totalOrders: 0,
    availableBalance: 0,
    revenueTotal: 0,
  });

  logger.info(`[ADMIN] Fetched ${items.length} sellers by admin ${req.auth.id}`);
  res.json({
    items,
    summary,
    total: totalItems,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
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
