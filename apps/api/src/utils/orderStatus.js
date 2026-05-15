export const ORDER_STATUS_VALUES = [
  'pending',
  'paid',
  'waiting_admin_validation',
  'validated',
  'processing',
  'shipped',
  'dhl_delivered',
  'delivered',
  'waiting_payout_release',
  'payout_available',
  'paid_out',
  'completed',
  'cancelled',
  'refunded',
];

export const ORDER_TERMINAL_STATUSES = new Set(['paid_out', 'completed', 'cancelled', 'refunded']);
export const ORDER_REVENUE_EXCLUDED_STATUSES = new Set(['cancelled', 'refunded']);
export const ORDER_ACTIVE_STATUSES = new Set([
  'pending',
  'paid',
  'waiting_admin_validation',
  'validated',
  'processing',
  'shipped',
  'dhl_delivered',
  'delivered',
  'waiting_payout_release',
  'payout_available',
]);
export const ORDER_COMPLETED_STATUSES = new Set(['paid_out', 'completed']);
export const ORDER_REVIEW_READY_STATUSES = new Set([
  'dhl_delivered',
  'delivered',
  'waiting_payout_release',
  'payout_available',
  'paid_out',
  'completed',
]);
export const ORDER_LABEL_ELIGIBLE_STATUSES = new Set([
  'paid',
  'waiting_admin_validation',
  'validated',
  'processing',
]);
export const ORDER_DELIVERED_STATUSES = new Set([
  'dhl_delivered',
  'delivered',
  'waiting_payout_release',
  'payout_available',
  'paid_out',
  'completed',
]);

const TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['waiting_admin_validation', 'validated', 'processing', 'shipped', 'cancelled', 'refunded'],
  waiting_admin_validation: ['validated', 'cancelled', 'refunded'],
  validated: ['waiting_admin_validation', 'processing', 'shipped', 'cancelled', 'refunded'],
  processing: ['waiting_admin_validation', 'shipped', 'cancelled', 'refunded'],
  shipped: ['dhl_delivered', 'delivered', 'cancelled', 'refunded'],
  dhl_delivered: ['waiting_payout_release', 'refunded'],
  delivered: ['waiting_payout_release', 'refunded'],
  waiting_payout_release: ['payout_available', 'refunded'],
  payout_available: ['paid_out', 'refunded'],
  paid_out: [],
  completed: [],
  cancelled: ['refunded'],
  refunded: [],
};

export const isOrderStatus = (status) => ORDER_STATUS_VALUES.includes(String(status || '').trim());

export const canTransitionOrderStatus = (fromStatus, toStatus) => {
  const from = String(fromStatus || 'pending').trim();
  const to = String(toStatus || '').trim();

  if (!isOrderStatus(to)) return false;
  if (!from || from === to) return true;
  if (!isOrderStatus(from)) return true;

  return (TRANSITIONS[from] || []).includes(to);
};

export const getAllowedNextOrderStatuses = (status) => {
  const normalized = String(status || 'pending').trim();
  return TRANSITIONS[normalized] || [];
};

export const shouldExcludeOrderFromRevenue = (status) =>
  ORDER_REVENUE_EXCLUDED_STATUSES.has(String(status || '').trim());

export const isOrderActive = (status) =>
  ORDER_ACTIVE_STATUSES.has(String(status || '').trim());

export const isOrderCompleted = (status) =>
  ORDER_COMPLETED_STATUSES.has(String(status || '').trim());

export const isOrderReviewReady = (status) =>
  ORDER_REVIEW_READY_STATUSES.has(String(status || '').trim());

export const canGenerateLabelForStatus = (status) =>
  ORDER_LABEL_ELIGIBLE_STATUSES.has(String(status || '').trim());
