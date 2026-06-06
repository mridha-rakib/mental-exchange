import Pocketbase from 'pocketbase';
import { getDeviceSessionHeaders } from '@/lib/deviceSession.js';

const POCKETBASE_API_URL = "/hcgi/platform";

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

pocketbaseClient.beforeSend = (url, options) => ({
  url,
  options: {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getDeviceSessionHeaders(),
    },
  },
});

export default pocketbaseClient;

export { POCKETBASE_API_URL, pocketbaseClient };
