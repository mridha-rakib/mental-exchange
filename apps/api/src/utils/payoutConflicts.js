import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { syncSellerBalance, syncSellerBalancesForOrder } from './sellerBalance.js';

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const sanitizePayoutConflict = (conflict) => ({
  id: conflict?.id || '',
  seller_id: conflict?.seller_id || '',
  order_id: conflict?.order_id || '',
  earning_id: conflict?.earning_id || '',
  payout_request_id: conflict?.payout_request_id || '',
  status: conflict?.status || 'open',
  reason: conflict?.reason || '',
  admin_notes: conflict?.admin_notes || '',
  blocked_amount: Number(conflict?.blocked_amount) || 0,
  created_by: conflict?.created_by || '',
  resolved_by: conflict?.resolved_by || '',
  resolved_at: conflict?.resolved_at || '',
  metadata: conflict?.metadata || {},
  created: conflict?.created || '',
  updated: conflict?.updated || '',
});

export const getOpenPayoutConflictsForSeller = async (sellerId) => {
  const sellerIdStr = String(sellerId || '').trim();
  if (!sellerIdStr) return [];

  return pb.collection('seller_payout_conflicts').getFullList({
    filter: `seller_id="${escapeFilterValue(sellerIdStr)}" && status="open"`,
    sort: '-created',
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[PAYOUT CONFLICT] Failed to load open conflicts for seller ${sellerIdStr}: ${error.message}`);
    return [];
  });
};

export const listPayoutConflicts = async ({ status = 'open', sellerId = '', limit = 100 } = {}) => {
  const filters = [];
  if (status && status !== 'all') filters.push(`status="${escapeFilterValue(status)}"`);
  if (sellerId) filters.push(`seller_id="${escapeFilterValue(sellerId)}"`);

  const result = await pb.collection('seller_payout_conflicts').getList(1, Math.min(Math.max(Number(limit) || 100, 1), 200), {
    filter: filters.join(' && ') || undefined,
    sort: '-created',
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[PAYOUT CONFLICT] Failed to list payout conflicts: ${error.message}`);
    return { items: [], totalItems: 0 };
  });

  return {
    items: result.items.map(sanitizePayoutConflict),
    total: result.totalItems || result.items.length,
  };
};

const loadEarningsForConflict = async ({ earningId = '', orderId = '' }) => {
  if (earningId) {
    const earning = await pb.collection('seller_earnings').getOne(earningId, { $autoCancel: false });
    return [earning];
  }

  if (!orderId) return [];

  return pb.collection('seller_earnings').getFullList({
    filter: `order_id="${escapeFilterValue(orderId)}"`,
    sort: 'created',
    $autoCancel: false,
  });
};

export const createPayoutConflict = async ({
  earningId = '',
  orderId = '',
  payoutRequestId = '',
  reason,
  adminNotes = '',
  adminId = '',
} = {}) => {
  const normalizedReason = String(reason || '').trim();
  if (!normalizedReason) {
    const error = new Error('Conflict reason is required');
    error.status = 400;
    throw error;
  }

  const earnings = await loadEarningsForConflict({ earningId, orderId });
  const payableEarnings = earnings.filter((earning) => (
    earning && !['paid_out'].includes(String(earning.status || '').trim())
  ));

  if (payableEarnings.length === 0) {
    const error = new Error('No unpaid seller earnings found to block');
    error.status = 404;
    throw error;
  }

  const sellerIds = [...new Set(payableEarnings.map((earning) => String(earning.seller_id || '').trim()).filter(Boolean))];
  if (sellerIds.length !== 1) {
    const error = new Error('Conflict must target earnings for one seller');
    error.status = 400;
    throw error;
  }

  const blockedAmount = roundMoney(payableEarnings.reduce((sum, earning) => (
    sum + (Number(earning.net_amount ?? earning.gross_amount) || 0)
  ), 0));

  const conflict = await pb.collection('seller_payout_conflicts').create({
    seller_id: sellerIds[0],
    order_id: orderId || payableEarnings[0].order_id || '',
    earning_id: earningId || (payableEarnings.length === 1 ? payableEarnings[0].id : ''),
    payout_request_id: payoutRequestId || '',
    status: 'open',
    reason: normalizedReason,
    admin_notes: String(adminNotes || '').trim(),
    blocked_amount: blockedAmount,
    created_by: adminId || '',
    resolved_by: '',
    resolved_at: '',
    metadata: {
      earning_ids: payableEarnings.map((earning) => earning.id),
      previous_statuses: payableEarnings.map((earning) => ({ id: earning.id, status: earning.status || '' })),
    },
  }, { $autoCancel: false });

  await Promise.all(payableEarnings.map((earning) => pb.collection('seller_earnings').update(earning.id, {
    status: 'blocked',
    payout_release_blocked_reason: normalizedReason,
    payout_conflict_id: conflict.id,
  }, { $autoCancel: false })));

  if (orderId) {
    await pb.collection('orders').update(orderId, {
      payout_release_blocked_reason: normalizedReason,
    }, { $autoCancel: false }).catch(() => null);
    await syncSellerBalancesForOrder(orderId);
  } else {
    await syncSellerBalance(sellerIds[0]);
  }

  return sanitizePayoutConflict(conflict);
};

export const resolvePayoutConflict = async ({ conflictId, adminId = '', adminNotes = '', restore = true } = {}) => {
  const conflictIdStr = String(conflictId || '').trim();
  if (!conflictIdStr) {
    const error = new Error('Conflict ID is required');
    error.status = 400;
    throw error;
  }

  const conflict = await pb.collection('seller_payout_conflicts').getOne(conflictIdStr, { $autoCancel: false });
  const metadata = conflict.metadata && typeof conflict.metadata === 'object' ? conflict.metadata : {};
  const earningIds = Array.isArray(metadata.earning_ids)
    ? metadata.earning_ids
    : conflict.earning_id
      ? [conflict.earning_id]
      : [];
  const previousStatusById = new Map(
    Array.isArray(metadata.previous_statuses)
      ? metadata.previous_statuses.map((item) => [String(item?.id || ''), item?.status || 'available'])
      : [],
  );

  if (restore && earningIds.length > 0) {
    await Promise.all(earningIds.map(async (earningId) => {
      const earning = await pb.collection('seller_earnings').getOne(earningId, { $autoCancel: false }).catch(() => null);
      if (!earning || earning.status !== 'blocked' || earning.payout_conflict_id !== conflict.id) return null;

      return pb.collection('seller_earnings').update(earning.id, {
        status: previousStatusById.get(earning.id) || 'available',
        payout_release_blocked_reason: '',
        payout_conflict_id: '',
      }, { $autoCancel: false });
    }));
  }

  const resolvedAt = new Date().toISOString();
  const updated = await pb.collection('seller_payout_conflicts').update(conflict.id, {
    status: restore ? 'resolved' : 'dismissed',
    admin_notes: String(adminNotes || conflict.admin_notes || '').trim(),
    resolved_by: adminId || '',
    resolved_at: resolvedAt,
  }, { $autoCancel: false });

  if (conflict.order_id) {
    await pb.collection('orders').update(conflict.order_id, {
      payout_release_blocked_reason: '',
    }, { $autoCancel: false }).catch(() => null);
    await syncSellerBalancesForOrder(conflict.order_id);
  } else {
    await syncSellerBalance(conflict.seller_id);
  }

  return sanitizePayoutConflict(updated);
};
