import pb from '@/lib/pocketbaseClient.js';

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
  if (product?.image_url && !imageName) return product.image_url;

  const resolvedImage = imageName || getPrimaryProductImageName(product);
  if (!product || !resolvedImage) return null;

  return pb.files.getUrl(product, resolvedImage);
};

export const getProductImageUrls = (product) => {
  const urls = getProductImageNames(product)
    .map((imageName) => getProductImageUrl(product, imageName))
    .filter(Boolean);

  if (urls.length > 0) return urls;

  const primary = getProductImageUrl(product);
  return primary ? [primary] : [];
};
