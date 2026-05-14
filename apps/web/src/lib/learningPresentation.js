export const formatLearningPrice = (amount, currency, locale) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(Number(amount || 0));

export const getBillingIntervalLabel = (t, interval) => {
  const normalized = String(interval || '').trim().toLowerCase();

  if (normalized === 'year') return t('learning.per_year');
  if (normalized === 'month') return t('learning.per_month');
  if (normalized === 'manual') return t('learning.manual_access');

  return normalized || '--';
};

export const getPriceIntervalLabel = (t, amount, currency, interval, locale) =>
  t('learning.price_per_interval', {
    price: formatLearningPrice(amount, currency, locale),
    interval: getBillingIntervalLabel(t, interval),
  });

export const getMinutesLabel = (t, minutes) =>
  `${Number(minutes || 0)} ${t('learning.minutes_short')}`;

export const getLearningContentTypeLabel = (t, contentType) => {
  const normalized = String(contentType || '').trim();
  const key = `learning.format_${normalized}`;
  const label = t(key);
  return label === key ? normalized || '--' : label;
};

export const getLearningProgressStatusLabel = (t, status) => {
  const normalized = String(status || 'not_started').trim();
  const key = `learning.status_${normalized}`;
  const label = t(key);
  return label === key ? normalized : label;
};

export const getLearningTopicStatusLabel = (t, status) => {
  const normalized = String(status || 'not_started').trim();
  const key = {
    not_started: 'learning.topic_status_open',
    in_progress: 'learning.topic_status_started',
    completed: 'learning.topic_status_completed',
    to_repeat: 'learning.topic_status_to_repeat',
    overdue: 'learning.topic_status_overdue',
  }[normalized] || `learning.status_${normalized}`;
  const label = t(key);
  return label === key ? normalized : label;
};

export const getLearningTopicStatusToneClass = (status) => {
  const normalized = String(status || 'not_started').trim();
  if (normalized === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'to_repeat') return 'bg-amber-100 text-amber-800';
  if (normalized === 'overdue') return 'bg-rose-100 text-rose-700';
  if (normalized === 'in_progress') return 'bg-[#0000FF]/10 text-[#0000FF]';
  return 'bg-slate-100 text-slate-600';
};

export const getNextChargeCopy = (t, subscription, formattedDate) => {
  if (!subscription) return t('learning.no_next_charge_scheduled');

  const status = String(subscription.status || '').trim();
  const hasNextCharge = ['active', 'trialing', 'past_due'].includes(status) && subscription.currentPeriodEnd;
  const hasDate = formattedDate && formattedDate !== '--';

  if ((subscription.cancelAtPeriodEnd || status === 'canceled') && hasDate) {
    return t('learning.no_next_charge_due_cancellation', { date: formattedDate });
  }

  if (hasNextCharge && hasDate) {
    return t('learning.next_charge_due_on', { date: formattedDate });
  }

  return t('learning.no_next_charge_scheduled');
};
