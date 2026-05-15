import Stripe from 'stripe';
import pb from './pocketbaseClient.js';
import logger from './logger.js';
import { syncSellerBalance } from './sellerBalance.js';
import { getOpenPayoutConflictsForSeller, sanitizePayoutConflict } from './payoutConflicts.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://zahniboerse.com';

const cents = (amount) => Math.round((Number(amount) || 0) * 100);
const money = (amountCents) => Math.round((Number(amountCents) || 0)) / 100;
const escapeFilterValue = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const requireStripe = () => {
  if (!stripeConfigured()) {
    const error = new Error('Stripe is not configured');
    error.status = 503;
    throw error;
  }
};

const normalizeAccountStatus = (account) => {
  const currentlyDue = account?.requirements?.currently_due || [];
  const disabledReason = account?.requirements?.disabled_reason || '';
  const payoutsEnabled = account?.payouts_enabled === true;

  return {
    account_id: account?.id || '',
    charges_enabled: account?.charges_enabled === true,
    payouts_enabled: payoutsEnabled,
    details_submitted: account?.details_submitted === true,
    requirements_due: currentlyDue,
    disabled_reason: disabledReason,
    onboarding_status: payoutsEnabled
      ? 'complete'
      : account?.details_submitted
        ? 'pending_review'
        : 'incomplete',
    last_synced_at: new Date().toISOString(),
  };
};

const persistAccountStatus = async (userId, status) => pb.collection('users').update(userId, {
  stripe_connect_account_id: status.account_id || '',
  stripe_connect_onboarding_status: status.onboarding_status || 'incomplete',
  stripe_connect_charges_enabled: status.charges_enabled === true,
  stripe_connect_payouts_enabled: status.payouts_enabled === true,
  stripe_connect_details_submitted: status.details_submitted === true,
  stripe_connect_requirements_due: Array.isArray(status.requirements_due) ? status.requirements_due.join(',') : '',
  stripe_connect_disabled_reason: status.disabled_reason || '',
  stripe_connect_last_synced_at: status.last_synced_at || new Date().toISOString(),
}, { $autoCancel: false });

export const getSellerStripeConnectStatus = async (user) => {
  const accountId = String(user?.stripe_connect_account_id || '').trim();
  if (!accountId) {
    return {
      account_id: '',
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements_due: [],
      disabled_reason: '',
      onboarding_status: 'not_started',
      last_synced_at: user?.stripe_connect_last_synced_at || '',
    };
  }

  requireStripe();
  const account = await stripe.accounts.retrieve(accountId);
  const status = normalizeAccountStatus(account);
  await persistAccountStatus(user.id, status).catch((error) => {
    logger.warn(`[STRIPE CONNECT] Failed to persist account status for user ${user.id}: ${error.message}`);
  });
  return status;
};

export const ensureSellerStripeAccount = async (user) => {
  requireStripe();

  const existingAccountId = String(user?.stripe_connect_account_id || '').trim();
  if (existingAccountId) {
    const account = await stripe.accounts.retrieve(existingAccountId);
    const status = normalizeAccountStatus(account);
    await persistAccountStatus(user.id, status);
    return { account, status };
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'DE',
    email: user.email || undefined,
    capabilities: {
      transfers: { requested: true },
    },
    business_profile: {
      url: FRONTEND_URL,
    },
    metadata: {
      user_id: user.id,
      seller_username: user.seller_username || '',
    },
  });
  const status = normalizeAccountStatus(account);
  await persistAccountStatus(user.id, status);
  return { account, status };
};

export const createSellerStripeOnboardingLink = async (user) => {
  const { account, status } = await ensureSellerStripeAccount(user);
  const returnUrl = `${FRONTEND_URL}/seller-dashboard?tab=earnings&account=payouts&stripe_connect=return`;
  const refreshUrl = `${FRONTEND_URL}/seller-dashboard?tab=earnings&account=payouts&stripe_connect=refresh`;
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return {
    url: accountLink.url,
    status,
  };
};

export const createSellerStripeLoginLink = async (user) => {
  requireStripe();

  const accountId = String(user?.stripe_connect_account_id || '').trim();
  if (!accountId) {
    const error = new Error('Seller has not started Stripe Connect onboarding');
    error.status = 400;
    throw error;
  }

  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return { url: loginLink.url };
};

const getAvailableEarningsForSeller = async (sellerId) => pb.collection('seller_earnings').getFullList({
  filter: `seller_id="${escapeFilterValue(sellerId)}" && (status="available" || status="confirmed")`,
  sort: 'created',
  $autoCancel: false,
});

const allocatePaidOutEarnings = async ({ sellerId, requestId, amount, paidAt }) => {
  let remainingCents = cents(amount);
  const earnings = await getAvailableEarningsForSeller(sellerId);

  for (const earning of earnings) {
    if (remainingCents <= 0) break;

    const netCents = cents(earning.net_amount ?? earning.gross_amount);
    if (netCents <= 0) continue;

    if (remainingCents >= netCents) {
      await pb.collection('seller_earnings').update(earning.id, {
        status: 'paid_out',
        payout_request_id: requestId,
        released_at: paidAt,
        payout_release_blocked_reason: '',
      }, { $autoCancel: false });
      remainingCents -= netCents;
      continue;
    }

    const paidCents = remainingCents;
    const residualCents = netCents - paidCents;
    const ratio = paidCents / netCents;
    const grossCents = cents(earning.gross_amount);
    const feeCents = cents(earning.transaction_fee);
    const paidGrossCents = Math.round(grossCents * ratio);
    const paidFeeCents = Math.round(feeCents * ratio);

    await pb.collection('seller_earnings').update(earning.id, {
      gross_amount: money(paidGrossCents),
      transaction_fee: money(paidFeeCents),
      net_amount: money(paidCents),
      status: 'paid_out',
      payout_request_id: requestId,
      released_at: paidAt,
      payout_release_blocked_reason: '',
    }, { $autoCancel: false });

    await pb.collection('seller_earnings').create({
      seller_id: sellerId,
      order_id: earning.order_id || '',
      gross_amount: money(grossCents - paidGrossCents),
      transaction_fee_percentage: earning.transaction_fee_percentage || 0,
      transaction_fee: money(feeCents - paidFeeCents),
      net_amount: money(residualCents),
      status: earning.status || 'available',
      available_at: earning.available_at || '',
      released_at: '',
      payout_release_blocked_reason: '',
      payout_request_id: '',
    }, { $autoCancel: false });

    remainingCents = 0;
  }

  if (remainingCents > 0) {
    const error = new Error('Available earnings no longer cover the payout request');
    error.status = 409;
    throw error;
  }
};

export const executeStripeConnectPayoutRequest = async ({ requestId, adminId }) => {
  requireStripe();

  const request = await pb.collection('seller_payout_requests').getOne(requestId, { $autoCancel: false });
  if (!['approved'].includes(String(request.status || ''))) {
    const error = new Error('Payout request must be approved before payment');
    error.status = 400;
    throw error;
  }

  const openConflicts = await getOpenPayoutConflictsForSeller(request.seller_id);
  if (openConflicts.length > 0) {
    const error = new Error('Seller has open payout conflicts that must be resolved before payout');
    error.status = 409;
    error.conflicts = openConflicts.map(sanitizePayoutConflict);
    throw error;
  }

  const seller = await pb.collection('users').getOne(request.seller_id, { $autoCancel: false });
  const status = await getSellerStripeConnectStatus(seller);
  if (!status.payouts_enabled) {
    const error = new Error('Seller Stripe Connect account is not payout-ready');
    error.status = 400;
    error.connectStatus = status;
    throw error;
  }

  const amountCents = cents(request.amount);
  if (amountCents <= 0) {
    const error = new Error('Payout amount must be greater than zero');
    error.status = 400;
    throw error;
  }

  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: String(request.currency || 'EUR').toLowerCase(),
    destination: status.account_id,
    description: `Seller payout request ${request.id}`,
    metadata: {
      seller_id: request.seller_id,
      payout_request_id: request.id,
      reviewed_by: adminId || '',
    },
    transfer_group: `PAYOUT_${request.id}`,
  });

  const paidAt = new Date().toISOString();
  await allocatePaidOutEarnings({
    sellerId: request.seller_id,
    requestId: request.id,
    amount: request.amount,
    paidAt,
  });

  const updatedRequest = await pb.collection('seller_payout_requests').update(request.id, {
    status: 'paid',
    paid_at: paidAt,
    reviewed_at: request.reviewed_at || paidAt,
    reviewed_by: request.reviewed_by || adminId || '',
    stripe_transfer_id: transfer.id || '',
    failure_reason: '',
  }, { $autoCancel: false });

  await syncSellerBalance(request.seller_id);
  return {
    request: updatedRequest,
    transfer,
  };
};
