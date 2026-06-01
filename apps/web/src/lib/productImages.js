import pb from '@/lib/pocketbaseClient.js';

const POCKETBASE_PROXY_URL = '/hcgi/platform';
const LOCAL_FILE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const normalizeProductImageUrl = (url) => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (LOCAL_FILE_HOSTS.has(parsedUrl.hostname) && parsedUrl.pathname.startsWith('/api/files/')) {
      return `${POCKETBASE_PROXY_URL}${parsedUrl.pathname}${parsedUrl.search}`;
    }
  } catch {
    return url;
  }

  return url;
};

export const getProductImageNames = (product) => {
  if (!product) return [];

  const images = Array.isArray(product.images)
    ? product.images
    : product.images
      ? [product.images]
      : [];

  return images.filter(Boolean);
};

export const getPrimaryProductImageName = (product) =>
  getProductImageNames(product)[0] || product?.image || '';

export const getProductImageUrl = (product, imageName = '') => {
  if (product?.image_url && !imageName) return normalizeProductImageUrl(product.image_url);

  const resolvedImage = imageName || getPrimaryProductImageName(product);
  if (!product || !resolvedImage) return null;

  return normalizeProductImageUrl(pb.files.getUrl(product, resolvedImage));
};

export const getProductImageUrls = (product) => {
  const urls = getProductImageNames(product)
    .map((imageName) => getProductImageUrl(product, imageName))
    .filter(Boolean);

  if (urls.length > 0) return urls;

  const primary = getProductImageUrl(product);
  return primary ? [primary] : [];
};
