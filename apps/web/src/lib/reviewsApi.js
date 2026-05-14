import apiServerClient from '@/lib/apiServerClient.js';

const parseJson = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Review request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const listCustomerReviews = async ({ featured = false, limit = 6, page = 1 } = {}) => {
  const params = new URLSearchParams({
    featured: String(featured),
    limit: String(limit),
    page: String(page),
  });

  const response = await apiServerClient.fetch(`/reviews?${params.toString()}`);
  const data = await parseJson(response);
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total || 0),
    page: Number(data.page || page),
    perPage: Number(data.perPage || limit),
    totalPages: Number(data.totalPages || 0),
  };
};

export const listProductReviews = async ({ productId, productType = 'marketplace', limit = 10, page = 1 }) => {
  const params = new URLSearchParams({
    type: productType,
    limit: String(limit),
    page: String(page),
  });

  const response = await apiServerClient.fetch(`/reviews/product/${encodeURIComponent(productId)}?${params.toString()}`);
  const data = await parseJson(response);

  return {
    items: Array.isArray(data.items) ? data.items : [],
    summary: data.summary || { count: 0, averageRating: 0 },
    total: Number(data.total || 0),
    page: Number(data.page || page),
    perPage: Number(data.perPage || limit),
    totalPages: Number(data.totalPages || 0),
  };
};

export const getProductReviewEligibility = async ({ token, productId, productType = 'marketplace' }) => {
  const params = new URLSearchParams({ type: productType });
  const response = await apiServerClient.fetch(`/reviews/product/${encodeURIComponent(productId)}/eligibility?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJson(response);
};

export const createCustomerReview = async ({ token, orderId, rating, body }) => {
  const response = await apiServerClient.fetch('/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      orderId,
      rating,
      body,
    }),
  });

  return parseJson(response);
};
