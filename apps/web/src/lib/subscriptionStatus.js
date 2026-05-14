const statusToneClasses = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  trialing: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  past_due: 'border-amber-200 bg-amber-50 text-amber-900',
  canceled: 'border-amber-200 bg-amber-50 text-amber-900',
  expired: 'border-slate-200 bg-slate-50 text-slate-700',
  unpaid: 'border-red-200 bg-red-50 text-red-800',
  paused: 'border-slate-200 bg-slate-50 text-slate-700',
  incomplete: 'border-slate-200 bg-slate-50 text-slate-700',
  incomplete_expired: 'border-slate-200 bg-slate-50 text-slate-700',
};

const badgeToneClasses = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-amber-100 text-amber-800',
  canceled: 'bg-amber-100 text-amber-800',
  expired: 'bg-slate-100 text-slate-600',
  unpaid: 'bg-red-100 text-red-700',
  paused: 'bg-slate-100 text-slate-600',
  incomplete: 'bg-slate-100 text-slate-600',
  incomplete_expired: 'bg-slate-100 text-slate-600',
};

export const getSubscriptionStatusLabel = (t, status) => {
  const normalizedStatus = String(status || '').trim();
  const key = `learning.status_${normalizedStatus}`;
  const translated = t(key);
  return translated === key ? normalizedStatus || '--' : translated;
};

export const getSubscriptionStatusToneClass = (status) =>
  statusToneClasses[String(status || '').trim()] || 'border-slate-200 bg-slate-50 text-slate-700';

export const getSubscriptionBadgeToneClass = (status) =>
  badgeToneClasses[String(status || '').trim()] || 'bg-slate-100 text-slate-600';

export const getSubscriptionStatusHintKey = (status) => {
  switch (String(status || '').trim()) {
    case 'past_due':
      return 'learning.status_past_due_hint';
    case 'canceled':
      return 'learning.status_canceled_hint';
    case 'expired':
      return 'learning.status_expired_hint';
    case 'unpaid':
      return 'learning.status_unpaid_hint';
    case 'paused':
      return 'learning.status_paused_hint';
    default:
      return '';
  }
};

export const getSubscriptionNoAccessTitleKey = (status) => {
  switch (String(status || '').trim()) {
    case 'expired':
      return 'learning.no_access_expired_title';
    case 'unpaid':
      return 'learning.no_access_unpaid_title';
    case 'paused':
      return 'learning.no_access_paused_title';
    default:
      return 'learning.no_subscription_title';
  }
};

export const getSubscriptionNoAccessBodyKey = (status) => {
  switch (String(status || '').trim()) {
    case 'expired':
      return 'learning.no_access_expired_body';
    case 'unpaid':
      return 'learning.no_access_unpaid_body';
    case 'paused':
      return 'learning.no_access_paused_body';
    default:
      return 'learning.no_subscription_body';
  }
};

export const getSubscriptionDateLabelKey = (subscription) => {
  const status = String(subscription?.status || '').trim();
  if (status === 'active' || status === 'trialing') {
    return 'learning.next_billing_date';
  }

  if (status === 'past_due') {
    return 'learning.grace_access_until';
  }

  return 'learning.subscription_active_until';
};

export const getSubscriptionDisplayEndDate = (subscription) =>
  subscription?.effectiveAccessEndsAt
  || subscription?.graceEndsAt
  || subscription?.accessEndsAt
  || subscription?.currentPeriodEnd
  || '';
