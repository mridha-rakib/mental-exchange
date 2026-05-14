import apiServerClient from '@/lib/apiServerClient.js';

const isAlreadySubscribedResponse = (data) =>
  typeof data?.message === 'string' && data.message.toLowerCase().includes('already subscribed');

export const subscribeToNewsletter = async ({ email, fallbackMessage }) => {
  const response = await apiServerClient.fetch('/email/newsletter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || data?.error || fallbackMessage);
  }

  if (data?.success === false && !isAlreadySubscribedResponse(data)) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
};

export default subscribeToNewsletter;
