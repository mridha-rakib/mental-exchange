import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { getOrSyncSellerBalance, syncSellerBalance } from './sellerBalance.js';

export const PAYOUT_REQUEST_OPEN_STATUSES = new Set(['requested', 'reviewing', 'approved', 'processing']);
export const PAYOUT_REQUEST_STATUSES = new Set([
  'requested',
  'reviewing',
  'approved',
  'rejected',
  'cancelled',
  'processing',
  'paid',
  'failed',
]);

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const sanitizePayoutRequest = (request) => ({
  id: request?.id || '',
  seller_id: request?.seller_id || '',
  amount: Number(request?.amount) || 0,
  currency: request?.currency || 'EUR',
  status: request?.status || 'requested',
  seller_notes: request?.seller_notes || '',
  admin_notes: request?.admin_notes || '',
  requested_at: request?.requested_at || request?.created || '',
  reviewed_at: request?.reviewed_at || '',
  reviewed_by: request?.reviewed_by || '',
  paid_at: request?.paid_at || '',
  stripe_transfer_id: request?.stripe_transfer_id || '',
  stripe_payout_id: request?.stripe_payout_id || '',
  failure_reason: request?.failure_reason || '',
  balance_snapshot: request?.balance_snapshot || {},
  created: request?.created || '',
  updated: request?.updated || '',
});

export const getOpenPayoutRequestsForSeller = async (sellerId) => {
  const sellerIdStr = String(sellerId || '').trim();
  if (!sellerIdStr) return [];

  const statusFilter = [...PAYOUT_REQUEST_OPEN_STATUSES]
    .map((status) => `status="${status}"`)
    .join(' || ');

  return pb.collection('seller_payout_requests').getFullList({
    filter: `seller_id="${escapeFilterValue(sellerIdStr)}" && (${statusFilter})`,
    sort: '-created',
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[PAYOUT REQUEST] Failed to load open payout requests for seller ${sellerIdStr}: ${error.message}`);
    return [];
  });
};

export const getSellerPayoutRequestSummary = async (sellerId) => {
  const [balance, openRequests] = await Promise.all([
    getOrSyncSellerBalance(sellerId),
    getOpenPayoutRequestsForSeller(sellerId),
  ]);
  const requestedAmount = roundMoney(openRequests.reduce((sum, request) => sum + (Number(request.amount) || 0), 0));
  const availableAmount = roundMoney(balance?.available_amount || 0);
  const requestableAmount = Math.max(0, roundMoney(availableAmount - requestedAmount));

  return {
    balance,
    open_requests: openRequests.map(sanitizePayoutRequest),
    open_request_amount: requestedAmount,
    requestable_amount: requestableAmount,
  };
};

export const listSellerPayoutRequests = async (sellerId, { limit = 50 } = {}) => {
  const sellerIdStr = String(sellerId || '').trim();
  if (!sellerIdStr) return [];

  const items = await pb.collection('seller_payout_requests').getList(1, Math.min(Math.max(Number(limit) || 50, 1), 100), {
    filter: `seller_id="${escapeFilterValue(sellerIdStr)}"`,
    sort: '-created',
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[PAYOUT REQUEST] Failed to load payout requests for seller ${sellerIdStr}: ${error.message}`);
    return { items: [] };
  });

  return items.items.map(sanitizePayoutRequest);
};

export const createSellerPayoutRequest = async ({ sellerId, amount, sellerNotes = '' }) => {
  const sellerIdStr = String(sellerId || '').trim();
  if (!sellerIdStr) {
    const error = new Error('seller_id is required');
    error.status = 400;
    throw error;
  }

  const requestedAmount = roundMoney(amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    const error = new Error('Payout amount must be greater than zero');
    error.status = 400;
    throw error;
  }

  await syncSellerBalance(sellerIdStr);
  const summary = await getSellerPayoutRequestSummary(sellerIdStr);
  if (requestedAmount > summary.requestable_amount) {
    const error = new Error('Requested payout amount exceeds available balance');
    error.status = 400;
    error.availableAmount = summary.balance?.available_amount || 0;
    error.openRequestAmount = summary.open_request_amount;
    error.requestableAmount = summary.requestable_amount;
    throw error;
  }

  const now = new Date().toISOString();
  const request = await pb.collection('seller_payout_requests').create({
    seller_id: sellerIdStr,
    amount: requestedAmount,
    currency: summary.balance?.currency || 'EUR',
    status: 'requested',
    seller_notes: String(sellerNotes || '').trim(),
    admin_notes: '',
    requested_at: now,
    reviewed_at: '',
    reviewed_by: '',
    paid_at: '',
    stripe_transfer_id: '',
    stripe_payout_id: '',
    failure_reason: '',
    balance_snapshot: {
      available_amount: summary.balance?.available_amount || 0,
      open_request_amount: summary.open_request_amount,
      requestable_amount: summary.requestable_amount,
      pending_amount: summary.balance?.pending_amount || 0,
      waiting_amount: summary.balance?.waiting_amount || 0,
      blocked_amount: summary.balance?.blocked_amount || 0,
      last_synced_at: summary.balance?.last_synced_at || '',
    },
  }, { $autoCancel: false });

  return sanitizePayoutRequest(request);
};

export const cancelSellerPayoutRequest = async ({ sellerId, requestId }) => {
  const sellerIdStr = String(sellerId || '').trim();
  const requestIdStr = String(requestId || '').trim();
  if (!sellerIdStr || !requestIdStr) {
    const error = new Error('request id is required');
    error.status = 400;
    throw error;
  }

  const request = await pb.collection('seller_payout_requests').getOne(requestIdStr, { $autoCancel: false });
  if (String(request.seller_id || '') !== sellerIdStr) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  if (!['requested', 'reviewing'].includes(String(request.status || ''))) {
    const error = new Error('Only requested or reviewing payout requests can be cancelled');
    error.status = 400;
    throw error;
  }

  const updated = await pb.collection('seller_payout_requests').update(requestIdStr, {
    status: 'cancelled',
    admin_notes: request.admin_notes || '',
  }, { $autoCancel: false });

  return sanitizePayoutRequest(updated);
};
