import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { canTransitionOrderStatus } from './orderStatus.js';

export const PAYOUT_WAITING_PERIOD_DAYS = 2;
export const PAYOUT_WAITING_PERIOD_MS = PAYOUT_WAITING_PERIOD_DAYS * 24 * 60 * 60 * 1000;

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const safeDate = (value, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const toIso = (value) => safeDate(value).toISOString();

export const calculatePayoutReleaseAt = (deliveredAt) =>
  new Date(safeDate(deliveredAt).getTime() + PAYOUT_WAITING_PERIOD_MS).toISOString();

const updateSellerEarningsForOrder = async (orderId, updateData, predicate = () => true) => {
  const earnings = await pb.collection('seller_earnings').getFullList({
    filter: `order_id="${escapeFilterValue(orderId)}"`,
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[PAYOUT WAIT] Failed to load seller earnings for order ${orderId}: ${error.message}`);
    return [];
  });

  await Promise.all(
    earnings
      .filter(predicate)
      .map((earning) => pb.collection('seller_earnings').update(earning.id, updateData, { $autoCancel: false }).catch((error) => {
        logger.warn(`[PAYOUT WAIT] Failed to update seller earning ${earning.id}: ${error.message}`);
        return null;
      })),
  );

  return earnings.length;
};

const logOrderStatusEvent = async ({ orderId, adminId = '', eventType, fromStatus = '', toStatus = '', note = '', metadata = {} }) => {
  if (!orderId || !eventType) return null;

  return pb.collection('order_status_events').create({
    order_id: String(orderId),
    admin_id: adminId ? String(adminId) : '',
    event_type: String(eventType),
    from_status: fromStatus ? String(fromStatus) : '',
    to_status: toStatus ? String(toStatus) : '',
    note: note ? String(note) : '',
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  }, { $autoCancel: false }).catch((error) => {
    logger.warn(`[PAYOUT WAIT] Failed to log order event for ${orderId}: ${error.message}`);
    return null;
  });
};

export const startPayoutWaitingPeriodForOrder = async ({
  order,
  deliveredAt,
  source = 'delivery_confirmation',
  actorId = '',
} = {}) => {
  if (!order?.id) return order;

  const deliveredAtIso = toIso(deliveredAt || order.delivered_at || order.dhl_delivered_at || new Date());
  const releaseAt = order.payout_release_at || calculatePayoutReleaseAt(deliveredAtIso);
  const fromStatus = order.status || 'pending';
  const shouldMoveToWaiting = canTransitionOrderStatus(fromStatus, 'waiting_payout_release');
  const updateData = {
    delivered_at: order.delivered_at || deliveredAtIso,
    payout_release_at: releaseAt,
    delivery_status_source: order.delivery_status_source || source,
    payout_release_blocked_reason: '',
  };

  if (shouldMoveToWaiting) {
    updateData.status = 'waiting_payout_release';
  }

  const updatedOrder = await pb.collection('orders').update(order.id, updateData, { $autoCancel: false });

  await updateSellerEarningsForOrder(order.id, {
    status: 'waiting_payout_release',
    available_at: releaseAt,
    payout_release_blocked_reason: '',
  }, (earning) => !['available', 'confirmed'].includes(String(earning.status || '').trim()));

  if (shouldMoveToWaiting && fromStatus !== 'waiting_payout_release') {
    await logOrderStatusEvent({
      orderId: order.id,
      adminId: actorId,
      eventType: 'payout_wait_started',
      fromStatus,
      toStatus: 'waiting_payout_release',
      note: `Payout waiting period started until ${releaseAt}.`,
      metadata: {
        source,
        delivered_at: deliveredAtIso,
        payout_release_at: releaseAt,
        waiting_period_days: PAYOUT_WAITING_PERIOD_DAYS,
      },
    });
  }

  return updatedOrder;
};

const hasOpenReturnRequest = async (orderId) => {
  const returns = await pb.collection('returns').getFullList({
    filter: `order_id="${escapeFilterValue(orderId)}" && (status="Pending" || status="Approved")`,
    $autoCancel: false,
  }).catch(() => []);

  return returns.length > 0;
};

const getPayoutReleaseBlockReason = async (order) => {
  const refundStatus = String(order.refund_status || '').trim().toLowerCase();
  if (['cancelled', 'refunded'].includes(String(order.status || '').trim())) return 'order_not_payable';
  if (order.stripe_refund_id || (refundStatus && !['failed', 'cancelled'].includes(refundStatus))) return 'refund_in_progress';
  if (await hasOpenReturnRequest(order.id)) return 'return_request_open';
  return '';
};

export const releaseEligiblePayouts = async ({ now = new Date(), actorId = '', limit = 100 } = {}) => {
  const nowIso = toIso(now);
  const orders = await pb.collection('orders').getFullList({
    filter: `status="waiting_payout_release" && payout_release_at <= "${escapeFilterValue(nowIso)}"`,
    sort: 'payout_release_at',
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[PAYOUT WAIT] Failed to load eligible payout orders: ${error.message}`);
    return [];
  });

  const limitedOrders = orders.slice(0, Math.max(1, Number(limit) || 100));
  const result = {
    checked: limitedOrders.length,
    released: 0,
    blocked: 0,
    items: [],
  };

  for (const order of limitedOrders) {
    const blockReason = await getPayoutReleaseBlockReason(order);

    if (blockReason) {
      await pb.collection('orders').update(order.id, {
        payout_release_blocked_reason: blockReason,
      }, { $autoCancel: false }).catch(() => null);
      await updateSellerEarningsForOrder(order.id, {
        status: 'blocked',
        payout_release_blocked_reason: blockReason,
      }, (earning) => !['confirmed'].includes(String(earning.status || '').trim()));

      result.blocked += 1;
      result.items.push({ order_id: order.id, status: 'blocked', reason: blockReason });
      continue;
    }

    if (!canTransitionOrderStatus(order.status, 'payout_available')) {
      result.blocked += 1;
      result.items.push({ order_id: order.id, status: 'blocked', reason: 'invalid_status_transition' });
      continue;
    }

    const updatedOrder = await pb.collection('orders').update(order.id, {
      status: 'payout_available',
      payout_released_at: nowIso,
      payout_release_blocked_reason: '',
    }, { $autoCancel: false });

    await updateSellerEarningsForOrder(order.id, {
      status: 'available',
      available_at: order.payout_release_at || nowIso,
      released_at: nowIso,
      payout_release_blocked_reason: '',
    }, (earning) => !['confirmed'].includes(String(earning.status || '').trim()));

    await logOrderStatusEvent({
      orderId: order.id,
      adminId: actorId,
      eventType: 'payout_available',
      fromStatus: order.status,
      toStatus: updatedOrder.status,
      note: 'Two-day payout waiting period completed.',
      metadata: {
        payout_release_at: order.payout_release_at || '',
        payout_released_at: nowIso,
      },
    });

    result.released += 1;
    result.items.push({ order_id: order.id, status: 'payout_available' });
  }

  return result;
};
