import pb from './pocketbaseClient.js';
import logger from './logger.js';

const BALANCE_COLLECTION = 'seller_balances';
const EARNINGS_COLLECTION = 'seller_earnings';

const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const emptyBalance = (sellerId) => ({
  seller_id: String(sellerId || ''),
  currency: 'EUR',
  pending_amount: 0,
  waiting_amount: 0,
  available_amount: 0,
  blocked_amount: 0,
  paid_out_amount: 0,
  lifetime_gross_amount: 0,
  lifetime_fee_amount: 0,
  lifetime_net_amount: 0,
  pending_count: 0,
  waiting_count: 0,
  available_count: 0,
  blocked_count: 0,
  paid_out_count: 0,
  order_count: 0,
  last_synced_at: new Date().toISOString(),
});

export const buildSellerBalanceFromEarnings = (sellerId, earnings = []) => {
  const balance = emptyBalance(sellerId);
  const orderIds = new Set();

  for (const earning of earnings) {
    const amount = roundMoney(earning.net_amount ?? earning.gross_amount);
    const grossAmount = roundMoney(earning.gross_amount);
    const feeAmount = roundMoney(earning.transaction_fee);
    const status = String(earning.status || 'pending').trim();

    if (earning.order_id) {
      orderIds.add(String(earning.order_id));
    }

    balance.lifetime_gross_amount = roundMoney(balance.lifetime_gross_amount + grossAmount);
    balance.lifetime_fee_amount = roundMoney(balance.lifetime_fee_amount + feeAmount);
    balance.lifetime_net_amount = roundMoney(balance.lifetime_net_amount + amount);

    if (status === 'waiting_payout_release') {
      balance.waiting_amount = roundMoney(balance.waiting_amount + amount);
      balance.waiting_count += 1;
    } else if (status === 'available' || status === 'confirmed') {
      balance.available_amount = roundMoney(balance.available_amount + amount);
      balance.available_count += 1;
    } else if (status === 'blocked') {
      balance.blocked_amount = roundMoney(balance.blocked_amount + amount);
      balance.blocked_count += 1;
    } else if (status === 'paid_out') {
      balance.paid_out_amount = roundMoney(balance.paid_out_amount + amount);
      balance.paid_out_count += 1;
    } else {
      balance.pending_amount = roundMoney(balance.pending_amount + amount);
      balance.pending_count += 1;
    }
  }

  balance.order_count = orderIds.size;
  balance.last_synced_at = new Date().toISOString();
  return balance;
};

export const syncSellerBalance = async (sellerId) => {
  const sellerIdStr = String(sellerId || '').trim();
  if (!sellerIdStr) return null;

  const earnings = await pb.collection(EARNINGS_COLLECTION).getFullList({
    filter: `seller_id="${escapeFilterValue(sellerIdStr)}"`,
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[SELLER BALANCE] Failed to load earnings for seller ${sellerIdStr}: ${error.message}`);
    return [];
  });

  const balance = buildSellerBalanceFromEarnings(sellerIdStr, earnings);
  const existing = await pb.collection(BALANCE_COLLECTION)
    .getFirstListItem(`seller_id="${escapeFilterValue(sellerIdStr)}"`, { $autoCancel: false })
    .catch(() => null);

  if (existing) {
    return pb.collection(BALANCE_COLLECTION).update(existing.id, balance, { $autoCancel: false }).catch((error) => {
      logger.warn(`[SELLER BALANCE] Failed to update balance for seller ${sellerIdStr}: ${error.message}`);
      return balance;
    });
  }

  return pb.collection(BALANCE_COLLECTION).create(balance, { $autoCancel: false }).catch((error) => {
    logger.warn(`[SELLER BALANCE] Failed to create balance for seller ${sellerIdStr}: ${error.message}`);
    return balance;
  });
};

export const syncSellerBalances = async (sellerIds = []) => {
  const uniqueSellerIds = [...new Set(sellerIds.map((sellerId) => String(sellerId || '').trim()).filter(Boolean))];
  return Promise.all(uniqueSellerIds.map((sellerId) => syncSellerBalance(sellerId)));
};

export const syncSellerBalancesForOrder = async (orderId) => {
  const orderIdStr = String(orderId || '').trim();
  if (!orderIdStr) return [];

  const earnings = await pb.collection(EARNINGS_COLLECTION).getFullList({
    filter: `order_id="${escapeFilterValue(orderIdStr)}"`,
    $autoCancel: false,
  }).catch((error) => {
    logger.warn(`[SELLER BALANCE] Failed to load earnings for order ${orderIdStr}: ${error.message}`);
    return [];
  });

  return syncSellerBalances(earnings.map((earning) => earning.seller_id));
};

export const getOrSyncSellerBalance = async (sellerId) => {
  const sellerIdStr = String(sellerId || '').trim();
  if (!sellerIdStr) return emptyBalance('');

  const existing = await pb.collection(BALANCE_COLLECTION)
    .getFirstListItem(`seller_id="${escapeFilterValue(sellerIdStr)}"`, { $autoCancel: false })
    .catch(() => null);

  if (existing) return existing;
  return syncSellerBalance(sellerIdStr);
};
