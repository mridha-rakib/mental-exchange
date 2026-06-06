import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { getDeviceSessionHeaders } from '@/lib/deviceSession.js';

const originalFetch = apiServerClient.fetch;

apiServerClient.fetch = async (url, options = {}) => {
  const token = pb.authStore?.token;
  const headers = { ...getDeviceSessionHeaders(), ...(options.headers || {}) };

  // Inject Authorization header if token exists and header is not already set
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return originalFetch(url, {
    ...options,
    headers,
  });
};

export default apiServerClient;
