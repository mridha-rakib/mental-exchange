import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { buildDynamicProductFilters, getShopFilterDefinitions } from '../utils/shopFilters.js';

const router = express.Router();

const SORT_OPTIONS = new Set(['-created', 'created', 'price', '-price']);

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const getProductImages = (product) => (
  Array.isArray(product.images) ? product.images : product.images ? [product.images] : []
);

const getProductImageUrl = (product, imageName = '') => {
  const resolvedImage = imageName || getProductImages(product)[0] || product.image || '';
  return resolvedImage ? pb.files.getUrl(product, resolvedImage) : null;
};

const getMarketplaceBaseFilters = async () => {
  const filters = [
    'status="active"',
    'seller_id != ""',
    'shop_product != true',
  ];

  const adminUsers = await pb.collection('users').getFullList({
    filter: 'is_admin=true',
    fields: 'id',
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[MARKETPLACE] Failed to load admin users for product filter: ${error.message}`);
    return [];
  });

  adminUsers.forEach((user) => {
    filters.push(`seller_id != "${escapeFilterValue(user.id)}"`);
  });

  return filters;
};

const toProductResponse = (product) => ({
  ...product,
  source: 'marketplace',
  product_type: product.product_type || 'Article',
  images: getProductImages(product),
  image_urls: getProductImages(product).map((imageName) => getProductImageUrl(product, imageName)).filter(Boolean),
  image_url: getProductImageUrl(product),
  brand: product.brand || '',
  location: product.location || '',
  shipping_type: product.shipping_type || 'dhl_parcel',
  filter_values: product.filter_values || {},
  fachbereich: Array.isArray(product.fachbereich)
    ? product.fachbereich
    : product.fachbereich
      ? [product.fachbereich]
      : [],
});

router.get('/filters', async (_req, res, next) => {
  try {
    const filters = await getShopFilterDefinitions('marketplace');
    res.json({ items: filters });
  } catch (error) {
    logger.error(`[MARKETPLACE] Failed to fetch filter definitions: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage, 10) || 50, 1), 100);
    const sort = SORT_OPTIONS.has(req.query.sort) ? req.query.sort : '-created';

    const filters = await getMarketplaceBaseFilters();
    const filterDefinitions = await getShopFilterDefinitions('marketplace');
    filters.push(...buildDynamicProductFilters({ query: req.query, definitions: filterDefinitions }));

    const result = await pb.collection('products').getList(page, perPage, {
      filter: filters.join(' && '),
      sort,
      $autoCancel: false,
    });

    const items = result.items.map(toProductResponse);

    res.json({
      items,
      total: result.totalItems,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
      filters: filterDefinitions,
    });
  } catch (error) {
    logger.error(`[MARKETPLACE] Failed to fetch products: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

export default router;
