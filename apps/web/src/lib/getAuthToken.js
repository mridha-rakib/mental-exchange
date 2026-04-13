import pb from '@/lib/pocketbaseClient.js';

export const getAuthToken = () => {
  if (pb.authStore.isValid) {
    return pb.authStore.token;
  }
  return null;
};