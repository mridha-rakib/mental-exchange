export const getOrderTrackingNumber = (order) => (
  order?.tracking_number || order?.dhl_tracking_number || order?.dhl_shipment_number || ''
);

export const hasOrderLabel = (order) => Boolean(
  order?.has_label || order?.dhl_label_pdf || order?.dhl_label_url
);

export const getOrderLabelStatus = (order) => {
  const explicitStatus = String(order?.label_status || '').trim().toLowerCase();
  if (explicitStatus) return explicitStatus;
  if (hasOrderLabel(order)) return 'generated';
  return 'pending';
};

export const canGenerateOrderLabel = (order) => {
  const status = getOrderLabelStatus(order);
  return ['paid', 'waiting_admin_validation', 'validated', 'processing'].includes(order?.status)
    && !hasOrderLabel(order)
    && !getOrderTrackingNumber(order)
    && status !== 'generating'
    && status !== 'unknown';
};

export const getOrderLabelText = (order, language = 'DE') => {
  const isEnglish = language === 'EN';

  switch (getOrderLabelStatus(order)) {
    case 'generated':
      return isEnglish ? 'Label ready' : 'Label bereit';
    case 'generating':
      return isEnglish ? 'Label is being created' : 'Label wird erstellt';
    case 'failed':
      return isEnglish ? 'Label failed' : 'Label fehlgeschlagen';
    case 'unknown':
      return isEnglish ? 'Label needs review' : 'Label pruefen';
    case 'cancelled':
      return isEnglish ? 'Label cancelled' : 'Label storniert';
    default:
      return isEnglish ? 'Label pending' : 'Label ausstehend';
  }
};

export const getOrderLabelIssue = (order) => (
  order?.label_error || order?.label_failure_type || ''
);

export const buildOrderFromLabelResponse = (order, data = {}) => {
  const labelPdf = data.label_pdf || data.labelPdfBase64 || order?.dhl_label_pdf || '';
  const trackingNumber = data.tracking_number || data.shipmentNumber || order?.tracking_number || order?.dhl_tracking_number || '';
  const labelStatus = data.label_status || (labelPdf ? 'generated' : order?.label_status || 'pending');

  return {
    ...order,
    tracking_number: trackingNumber,
    dhl_tracking_number: trackingNumber,
    dhl_label_pdf: labelPdf,
    dhl_label_url: data.label_url || data.dhl_label_url || order?.dhl_label_url,
    has_label: Boolean(labelPdf || data.label_url || data.dhl_label_url || order?.has_label || order?.dhl_label_url),
    label_status: labelStatus,
    label_error: data.label_error || '',
    label_failure_type: data.label_failure_type || '',
    label_generated_at: data.generated_at || data.label_generated_at || order?.label_generated_at,
    destination_country: data.destination_country || order?.destination_country,
    dhl_product_used: data.product_used || data.dhl_product_used || order?.dhl_product_used,
  };
};

export const buildOrderFromLabelError = (order, data = {}, fallbackMessage = '') => ({
  ...order,
  label_status: data.label_status || order?.label_status || 'failed',
  label_error: data.details || data.error || fallbackMessage || order?.label_error || '',
  label_failure_type: data.label_failure_type || order?.label_failure_type || '',
});

export const downloadBase64Pdf = (pdfBase64, filename) => {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${pdfBase64}`;
  link.download = filename;
  link.click();
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
