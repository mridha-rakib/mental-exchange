const DEVICE_ID_STORAGE_KEY = 'zahniboerse_device_id';

const createDeviceId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export const getDeviceId = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const existingId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const nextId = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
  return nextId;
};

export const getDeviceLabel = () => {
  if (typeof navigator === 'undefined') {
    return 'Browser';
  }

  const platform = navigator.userAgentData?.platform || navigator.platform || 'Browser';
  return `${platform} browser`;
};

export const getDeviceSessionHeaders = () => ({
  'X-Device-Id': getDeviceId(),
  'X-Device-Label': getDeviceLabel(),
});
