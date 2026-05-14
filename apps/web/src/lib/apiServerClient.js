const API_PROXY_URL = '/hcgi/api';
const API_DIRECT_URL = import.meta.env.VITE_API_SERVER_URL || 'http://127.0.0.1:3001';

const isDevProxyFallbackEligible = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

const shouldRetryDirectApi = async (response) => {
  if (!response || response.ok || response.status !== 404 || !isDevProxyFallbackEligible()) {
    return false;
  }

  const responseText = await response.clone().text().catch(() => '');
  return responseText.includes('Route not found');
};

const toAbsoluteApiUrl = (url) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_DIRECT_URL}${url}`;
};

const apiServerClient = {
  fetch: async (url, options = {}) => {
    const proxyResponse = await window.fetch(`${API_PROXY_URL}${url}`, options);

    if (!(await shouldRetryDirectApi(proxyResponse))) {
      return proxyResponse;
    }

    return window.fetch(toAbsoluteApiUrl(url), options);
  },
};

export default apiServerClient;
export { apiServerClient };
