import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { canTransitionOrderStatus } from './orderStatus.js';
import { startPayoutWaitingPeriodForOrder } from './payoutWaitingPeriod.js';

const TRACKING_STATUS_KEYS = [
  'status',
  'statusCode',
  'status_code',
  'statusDescription',
  'status_description',
  'statusText',
  'status_text',
  'description',
  'eventStatus',
  'event_status',
  'eventStatusDescription',
  'event_status_description',
  'pieceStatus',
  'piece_status',
  'pieceStatusDesc',
  'piece_status_desc',
];

const TRACKING_DATE_KEYS = [
  'timestamp',
  'time',
  'date',
  'datetime',
  'dateTime',
  'eventDate',
  'event_date',
  'eventTimestamp',
  'event_timestamp',
  'statusTimestamp',
  'status_timestamp',
];

const DELIVERY_POSITIVE_PATTERNS = [
  'delivered',
  'delivery successful',
  'successfully delivered',
  'shipment delivered',
  'has been delivered',
  'zugestellt',
  'zustellung erfolgreich',
  'erfolgreich zugestellt',
  'sendung wurde zugestellt',
];

const DELIVERY_NEGATIVE_PATTERNS = [
  'not delivered',
  'could not be delivered',
  'delivery failed',
  'failed delivery',
  'unable to deliver',
  'undeliverable',
  'returned to sender',
  'nicht zugestellt',
  'nicht erfolgreich zugestellt',
  'konnte nicht zugestellt',
];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const safeJsonObject = (value) => {
  if (value === undefined || value === null || value === '') return {};

  try {
    const cloned = JSON.parse(JSON.stringify(value));
    return cloned && typeof cloned === 'object' ? cloned : { value: cloned };
  } catch {
    return {};
  }
};

const readStringField = (node, keys) => {
  if (!node || typeof node !== 'object') return '';

  for (const key of keys) {
    const value = node[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }

  return '';
};

const summarizeTrackingNode = (node) => {
  if (!node || typeof node !== 'object') return '';

  const parts = TRACKING_STATUS_KEYS
    .map((key) => {
      const value = node[key];
      return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    })
    .filter(Boolean);

  return [...new Set(parts)].join(' - ');
};

const collectTrackingNodes = (value, nodes = [], seen = new WeakSet()) => {
  if (!value || typeof value !== 'object') return nodes;
  if (seen.has(value)) return nodes;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectTrackingNodes(item, nodes, seen));
    return nodes;
  }

  const hasTrackingField = [...TRACKING_STATUS_KEYS, ...TRACKING_DATE_KEYS].some((key) => key in value);
  if (hasTrackingField) {
    nodes.push(value);
  }

  Object.values(value).forEach((item) => collectTrackingNodes(item, nodes, seen));
  return nodes;
};

const isDeliveredTrackingText = (value) => {
  const text = normalizeText(value);
  if (!text) return false;
  if (DELIVERY_NEGATIVE_PATTERNS.some((pattern) => text.includes(pattern))) return false;
  return DELIVERY_POSITIVE_PATTERNS.some((pattern) => text.includes(pattern));
};

const findTrackingDate = (node) => {
  const rawDate = readStringField(node, TRACKING_DATE_KEYS);
  if (!rawDate) return '';

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return rawDate;
  return parsedDate.toISOString();
};

export const extractDhlDeliveryConfirmation = (tracking) => {
  const raw = tracking?.raw ?? tracking ?? {};
  const nodes = collectTrackingNodes(raw);
  const summarizedNodes = nodes
    .map((node) => ({ node, summary: summarizeTrackingNode(node) }))
    .filter((item) => item.summary);

  const deliveredMatch = summarizedNodes.find((item) => isDeliveredTrackingText(item.summary));
  const fallbackSummary = summarizedNodes[0]?.summary || '';
  const fallbackText = nodes.length === 0 ? JSON.stringify(safeJsonObject(raw)).slice(0, 10000) : '';
  const delivered = Boolean(deliveredMatch) || isDeliveredTrackingText(fallbackText);
  const deliveredAt = deliveredMatch ? findTrackingDate(deliveredMatch.node) : '';
  const statusNode = deliveredMatch?.node || summarizedNodes[0]?.node || null;
  const status = readStringField(statusNode, TRACKING_STATUS_KEYS) || (delivered ? 'delivered' : '');

  return {
    delivered,
    delivered_at: deliveredAt,
    status,
    summary: deliveredMatch?.summary || fallbackSummary || (delivered ? 'delivered' : ''),
  };
};

const logOrderStatusEvent = async ({ orderId, adminId, eventType, fromStatus, toStatus, note = '', metadata = {} }) => {
  if (!orderId || !eventType) return null;

  return pb.collection('order_status_events').create({
    order_id: String(orderId),
    admin_id: adminId ? String(adminId) : '',
    event_type: String(eventType),
    from_status: fromStatus ? String(fromStatus) : '',
    to_status: toStatus ? String(toStatus) : '',
    note: note ? String(note) : '',
    metadata: safeJsonObject(metadata),
  }, { $autoCancel: false }).catch((error) => {
    logger.warn(`[DHL TRACKING] Failed to log order status event - Order: ${orderId}, Event: ${eventType}, Error: ${error.message}`);
    return null;
  });
};

export const buildDhlTrackingOrderResponse = (order) => ({
  id: order?.id || '',
  status: order?.status || '',
  tracking_number: order?.tracking_number || order?.dhl_tracking_number || order?.dhl_shipment_number || '',
  dhl_tracking_number: order?.dhl_tracking_number || '',
  dhl_shipment_number: order?.dhl_shipment_number || '',
  dhl_tracking_status: order?.dhl_tracking_status || '',
  dhl_tracking_summary: order?.dhl_tracking_summary || '',
  dhl_tracking_last_checked_at: order?.dhl_tracking_last_checked_at || '',
  dhl_delivered_at: order?.dhl_delivered_at || '',
  dhl_delivery_confirmed_at: order?.dhl_delivery_confirmed_at || '',
  delivered_at: order?.delivered_at || '',
  payout_release_at: order?.payout_release_at || '',
  payout_released_at: order?.payout_released_at || '',
  payout_release_blocked_reason: order?.payout_release_blocked_reason || '',
  delivery_status_source: order?.delivery_status_source || '',
});

export const persistDhlTrackingForOrder = async ({ order, tracking, requestedBy = '', source = 'tracking_lookup' }) => {
  const checkedAt = new Date().toISOString();
  const confirmation = extractDhlDeliveryConfirmation(tracking);
  const updateData = {
    dhl_tracking_status: confirmation.status || '',
    dhl_tracking_summary: confirmation.summary || '',
    dhl_tracking_last_checked_at: checkedAt,
    dhl_tracking_raw: safeJsonObject(tracking?.raw ?? tracking),
  };

  let statusChanged = false;
  if (confirmation.delivered) {
    updateData.dhl_delivered_at = order.dhl_delivered_at || confirmation.delivered_at || checkedAt;
    updateData.dhl_delivery_confirmed_at = order.dhl_delivery_confirmed_at || checkedAt;

    if (canTransitionOrderStatus(order.status, 'dhl_delivered')) {
      updateData.status = 'dhl_delivered';
      statusChanged = String(order.status || '') !== 'dhl_delivered';
    }
  }

  let updatedOrder = await pb.collection('orders').update(order.id, updateData, { $autoCancel: false });

  if (statusChanged) {
    await logOrderStatusEvent({
      orderId: order.id,
      adminId: requestedBy,
      eventType: 'dhl_delivery_confirmed',
      fromStatus: order.status,
      toStatus: 'dhl_delivered',
      note: 'DHL tracking confirmed delivery.',
      metadata: {
        source,
        tracking_number: order.tracking_number || order.dhl_tracking_number || order.dhl_shipment_number || '',
        dhl_tracking_status: confirmation.status || '',
        dhl_tracking_summary: confirmation.summary || '',
        dhl_delivered_at: updateData.dhl_delivered_at || '',
      },
    });
  }

  if (confirmation.delivered) {
    updatedOrder = await startPayoutWaitingPeriodForOrder({
      order: updatedOrder,
      deliveredAt: updateData.dhl_delivered_at || confirmation.delivered_at || checkedAt,
      source,
      actorId: requestedBy,
    });
  }

  return {
    confirmation,
    order: updatedOrder,
    status_changed: statusChanged,
  };
};
