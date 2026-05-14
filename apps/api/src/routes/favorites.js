import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/index.js';

const router = express.Router();

router.use(requireAuth);

const normalizeProductId = (body = {}) => {
  const raw = body.product_id ?? body.productId ?? body.id ?? '';
  return String(raw).trim();
};

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const normalizeMarketplaceProduct = (product) => product ? ({
  ...product,
  product_type: product.product_type || 'Article',
  fachbereich: Array.isArray(product.fachbereich)
    ? product.fachbereich
    : product.fachbereich
      ? [product.fachbereich]
      : [],
  source: 'marketplace',
}) : null;

const normalizeShopProduct = (product) => product ? ({
  id: product.id,
  collectionId: product.collectionId,
  collectionName: product.collectionName,
  name: product.name,
  description: product.description || '',
  price: product.price,
  image: product.image || null,
  image_url: product.image ? pb.files.getUrl(product, product.image) : null,
  condition: product.condition || null,
  fachbereich: Array.isArray(product.fachbereich)
    ? product.fachbereich
    : product.fachbereich
      ? [product.fachbereich]
      : [],
  product_type: product.product_type || 'Article',
  source: 'shop',
  created: product.created,
  updated: product.updated,
}) : null;

const getProductById = async (productId) => {
  try {
    const product = await pb.collection('products').getOne(productId, { $autoCancel: false });
    return normalizeMarketplaceProduct(product);
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  try {
    const product = await pb.collection('shop_products').getOne(productId, { $autoCancel: false });
    return normalizeShopProduct(product);
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  return null;
};

const getProductMap = async (productIds = []) => {
  const ids = [...new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean))];

  if (ids.length === 0) {
    return new Map();
  }

  const filter = ids.map((id) => `id="${escapeFilterValue(id)}"`).join(' || ');
  const marketplaceProducts = await pb.collection('products').getFullList({
    filter,
    $autoCancel: false,
  });

  const productMap = new Map(
    marketplaceProducts.map((product) => [String(product.id).trim(), normalizeMarketplaceProduct(product)])
  );

  const missingIds = ids.filter((id) => !productMap.has(id));
  if (missingIds.length > 0) {
    const shopFilter = missingIds.map((id) => `id="${escapeFilterValue(id)}"`).join(' || ');
    const shopProducts = await pb.collection('shop_products').getFullList({
      filter: shopFilter,
      $autoCancel: false,
    });

    shopProducts.forEach((product) => {
      productMap.set(String(product.id).trim(), normalizeShopProduct(product));
    });
  }

  return productMap;
};

const buildFavoriteResponse = (favorite, productMap = new Map()) => {
  const productId = String(favorite.product_id).trim();

  return {
    id: String(favorite.id).trim(),
    user_id: String(favorite.user_id).trim(),
    product_id: productId,
    product: productMap.get(productId) || null,
    created_at: favorite.created,
  };
};

router.post('/', async (req, res, next) => {
  try {
    const userId = String(req.auth?.id || '').trim();
    const productIdStr = normalizeProductId(req.body);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!productIdStr) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const product = await getProductById(productIdStr);

    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const existingFavorites = await pb.collection('favorites').getFullList({
      filter: `user_id="${userId}" && product_id="${productIdStr}"`,
      expand: 'product_id',
      $autoCancel: false,
    });

    if (existingFavorites.length > 0) {
      const favorite = buildFavoriteResponse(existingFavorites[0], new Map([[productIdStr, product]]));
      return res.status(200).json({
        success: true,
        idempotent: true,
        favorite_id: favorite.id,
        product_id: favorite.product_id,
        favorite,
        message: 'Product is already in favorites',
      });
    }

    const favoriteRecord = await pb.collection('favorites').create(
      {
        user_id: userId,
        product_id: productIdStr,
      },
      { $autoCancel: false }
    );

    const favoriteWithExpand = await pb.collection('favorites').getOne(favoriteRecord.id, {
      expand: 'product_id',
      $autoCancel: false,
    });

    const favorite = buildFavoriteResponse(favoriteWithExpand, new Map([[productIdStr, product]]));

    res.status(200).json({
      success: true,
      idempotent: false,
      action: 'added',
      favorite_id: favorite.id,
      product_id: favorite.product_id,
      favorite,
      message: 'Product added to favorites successfully',
    });
  } catch (error) {
    if (error?.status === 404) {
      return res.status(400).json({ error: 'Product not found' });
    }

    logger.error(`[FAVORITES] POST /favorites error: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

router.post('/toggle', async (req, res, next) => {
  try {
    const userId = String(req.auth?.id || '').trim();
    const productIdStr = normalizeProductId(req.body);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!productIdStr) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const existingFavorites = await pb.collection('favorites').getFullList({
      filter: `user_id="${userId}" && product_id="${productIdStr}"`,
      expand: 'product_id',
      $autoCancel: false,
    });

    if (existingFavorites.length > 0) {
      const favorite = existingFavorites[0];
      await pb.collection('favorites').delete(favorite.id, { $autoCancel: false });

      return res.status(200).json({
        success: true,
        action: 'removed',
        favorite_id: String(favorite.id).trim(),
        product_id: productIdStr,
        isFavorite: false,
        message: 'Product removed from favorites successfully',
      });
    }

    const product = await getProductById(productIdStr);

    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const created = await pb.collection('favorites').create(
      {
        user_id: userId,
        product_id: productIdStr,
      },
      { $autoCancel: false }
    );

    const favoriteWithExpand = await pb.collection('favorites').getOne(created.id, {
      expand: 'product_id',
      $autoCancel: false,
    });

    return res.status(200).json({
      success: true,
      action: 'added',
      favorite_id: String(created.id).trim(),
      product_id: productIdStr,
      isFavorite: true,
      favorite: buildFavoriteResponse(favoriteWithExpand, new Map([[productIdStr, product]])),
      message: 'Product added to favorites successfully',
    });
  } catch (error) {
    if (error?.status === 404) {
      return res.status(400).json({ error: 'Product not found' });
    }

    logger.error(`[FAVORITES] POST /favorites/toggle error: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const userId = String(req.auth?.id || '').trim();

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;

    if (page < 1) {
      return res.status(400).json({ error: 'page must be >= 1' });
    }

    if (perPage < 1 || perPage > 100) {
      return res.status(400).json({ error: 'perPage must be between 1 and 100' });
    }

    const result = await pb.collection('favorites').getList(page, perPage, {
      filter: `user_id="${userId}"`,
      sort: '-created',
      expand: 'product_id',
      $autoCancel: false,
    });

    const productMap = await getProductMap(result.items.map((favorite) => favorite.product_id));
    const formattedFavorites = result.items.map((favorite) => buildFavoriteResponse(favorite, productMap));

    res.status(200).json({
      success: true,
      favorites: formattedFavorites,
      items: formattedFavorites,
      total: result.totalItems,
      page: result.page,
      perPage: result.perPage,
    });
  } catch (error) {
    logger.error(`[FAVORITES] GET /favorites error: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

router.delete('/:favorite_id', async (req, res, next) => {
  try {
    const userId = String(req.auth?.id || '').trim();
    const favoriteIdStr = String(req.params.favorite_id || '').trim();

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!favoriteIdStr) {
      return res.status(400).json({ error: 'favorite_id is required' });
    }

    const favorite = await pb.collection('favorites').getOne(favoriteIdStr, { $autoCancel: false });

    if (String(favorite.user_id).trim() !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this favorite' });
    }

    await pb.collection('favorites').delete(favoriteIdStr, { $autoCancel: false });

    res.status(200).json({
      success: true,
      favorite_id: favoriteIdStr,
      product_id: String(favorite.product_id).trim(),
      message: 'Favorite removed successfully',
    });
  } catch (error) {
    if (error?.status === 404) {
      return res.status(400).json({ error: 'Favorite not found' });
    }

    logger.error(`[FAVORITES] DELETE /favorites/:favorite_id error: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

router.delete('/product/:product_id', async (req, res, next) => {
  try {
    const userId = String(req.auth?.id || '').trim();
    const productIdStr = String(req.params.product_id || '').trim();

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!productIdStr) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const favorites = await pb.collection('favorites').getFullList({
      filter: `user_id="${userId}" && product_id="${productIdStr}"`,
      $autoCancel: false,
    });

    if (favorites.length === 0) {
      return res.status(404).json({ error: 'Product not in favorites' });
    }

    await pb.collection('favorites').delete(favorites[0].id, { $autoCancel: false });

    res.status(200).json({
      success: true,
      product_id: productIdStr,
      message: 'Product removed from favorites successfully',
    });
  } catch (error) {
    logger.error(`[FAVORITES] DELETE /favorites/product/:product_id error: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

export default router;
