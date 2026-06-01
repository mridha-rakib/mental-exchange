import pb, { POCKETBASE_HOST } from './pocketbaseClient.js';

const DEFAULT_PUBLIC_POCKETBASE_URL = '/hcgi/platform';

const getPublicPocketBaseBaseUrl = () => (
  process.env.POCKETBASE_PUBLIC_URL
  || process.env.POCKETBASE_BROWSER_URL
  || DEFAULT_PUBLIC_POCKETBASE_URL
).replace(/\/+$/, '');

export const getPublicPocketBaseFileUrl = (record, fileName, options = undefined) => {
  if (!record || !fileName) return null;

  try {
    const rawUrl = pb.files.getUrl(record, fileName, options);
    const parsedUrl = new URL(rawUrl, POCKETBASE_HOST);
    return `${getPublicPocketBaseBaseUrl()}${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
};
