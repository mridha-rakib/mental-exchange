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

const buildFavoriteResponse = (favorite) => ({
  id: String(favorite.id).trim(),
  user_id: String(favorite.user_id).trim(),
  product_id: String(favorite.product_id).trim(),
  product: favorite.expand?.product_id || null,
  created_at: favorite.created,
});

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

    await pb.collection('products').getOne(productIdStr, { $autoCancel: false });

    const existingFavorites = await pb.collection('favorites').getFullList({
      filter: `user_id="${userId}" && product_id="${productIdStr}"`,
      expand: 'product_id',
      $autoCancel: false,
    });

    if (existingFavorites.length > 0) {
      const favorite = buildFavoriteResponse(existingFavorites[0]);
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

    const favorite = buildFavoriteResponse(favoriteWithExpand);

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

    await pb.collection('products').getOne(productIdStr, { $autoCancel: false });

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
      favorite: buildFavoriteResponse(favoriteWithExpand),
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

    const formattedFavorites = result.items.map(buildFavoriteResponse);

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