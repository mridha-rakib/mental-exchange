import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  MapPin,
  Package,
  RotateCcw,
  Star,
  Truck,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { getAuthToken } from '@/lib/getAuthToken.js';
import {
  downloadBase64Pdf,
  getOrderLabelIssue,
  getOrderLabelText,
  getOrderTrackingNumber,
  hasOrderLabel,
} from '@/lib/dhlLabelUi.js';
import { createCustomerReview } from '@/lib/reviewsApi.js';

const parseShippingAddress = (rawAddress) => {
  if (!rawAddress) return {};
  if (typeof rawAddress === 'object') return rawAddress;

  try {
    return JSON.parse(rawAddress);
  } catch {
    return {};
  }
};

const triggerPdfDownload = (blobOrBase64, filename, mimeType = 'application/pdf') => {
  const link = document.createElement('a');

  if (typeof blobOrBase64 === 'string') {
    link.href = `data:${mimeType};base64,${blobOrBase64}`;
  } else {
    const url = URL.createObjectURL(blobOrBase64);
    link.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  link.download = filename;
  link.click();
};

const REVIEW_MIN_LENGTH = 10;
const REVIEW_MAX_LENGTH = 1200;

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { t, language } = useTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloadingReturnLabel, setDownloadingReturnLabel] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const locale = language === 'EN' ? 'en-US' : 'de-DE';
  const copy = useMemo(() => (
    language === 'EN'
      ? {
        returnTitle: 'Returns & claims',
        shippingLabel: 'Download shipping label',
        returnLabel: 'Download return label',
        marketplaceClaim: 'Open marketplace claim',
        marketplaceForm: 'Open review form',
        shopReturn: 'Open shop return',
        marketplaceBody: 'Marketplace purchases can be claimed within 2 days of the order date. After that, a review form is sent to admin for manual review.',
        shopBody: 'For shop purchases, open the return form with your order reference and choose the purchased product.',
        claimDeadline: 'Claim deadline',
        returnStatus: 'Return status',
        returnReason: 'Reason',
        returnDetails: 'Details',
        adminNotes: 'Admin notes',
        noReturnYet: 'No return request has been submitted for this order yet.',
        reviewTitle: 'Customer review',
        reviewIntro: 'Share your experience with this order. Reviews from completed purchases appear as verified customer reviews.',
        reviewRating: 'Rating',
        reviewComment: 'Review',
        reviewPlaceholder: 'What went well with this order?',
        reviewLengthHint: 'Enter at least 10 characters.',
        submitReview: 'Submit review',
        submittingReview: 'Submitting...',
        reviewSubmitted: 'Thanks. Your review is now published.',
        reviewError: 'Review could not be submitted.',
        reviewAlreadySubmitted: 'You have already reviewed this order.',
        reviewNotReady: 'Reviews can be added after the order is delivered.',
        yourReview: 'Your review',
        statusPending: 'Pending',
        statusApproved: 'Published',
        statusRejected: 'Rejected',
      }
      : {
        returnTitle: 'Retouren & Reklamationen',
        shippingLabel: 'Versandlabel herunterladen',
        returnLabel: 'Retourenlabel herunterladen',
        marketplaceClaim: 'Marktplatz-Reklamation starten',
        marketplaceForm: 'Prüfformular öffnen',
        shopReturn: 'Shop-Retoure starten',
        marketplaceBody: 'Marktplatzkäufe können innerhalb von 2 Tagen ab Bestelldatum reklamiert werden. Danach wird ein Formular an die Admin-Prüfung übergeben.',
        shopBody: 'Für Shop-Käufe öffnest du das Retourenformular mit deiner Bestellreferenz und wählst dort den gekauften Artikel aus.',
        claimDeadline: 'Reklamationsfrist',
        returnStatus: 'Retourenstatus',
        returnReason: 'Grund',
        returnDetails: 'Details',
        adminNotes: 'Admin-Hinweis',
        reviewTitle: 'Kundenbewertung',
        reviewIntro: 'Teile deine Erfahrung mit dieser Bestellung. Bewertungen abgeschlossener Kaeufe erscheinen als verifizierte Kundenbewertungen.',
        reviewRating: 'Bewertung',
        reviewComment: 'Bewertungstext',
        reviewPlaceholder: 'Was lief bei dieser Bestellung gut?',
        reviewLengthHint: 'Bitte gib mindestens 10 Zeichen ein.',
        submitReview: 'Bewertung senden',
        submittingReview: 'Wird gesendet...',
        reviewSubmitted: 'Danke. Deine Bewertung ist jetzt veroeffentlicht.',
        reviewError: 'Bewertung konnte nicht gesendet werden.',
        reviewAlreadySubmitted: 'Du hast diese Bestellung bereits bewertet.',
        reviewNotReady: 'Bewertungen koennen nach der Zustellung abgegeben werden.',
        yourReview: 'Deine Bewertung',
        statusPending: 'Ausstehend',
        statusApproved: 'Veroeffentlicht',
        statusRejected: 'Abgelehnt',
        noReturnYet: 'Für diese Bestellung wurde noch keine Rückgabe angelegt.',
      }
  ), [language]);

  useEffect(() => {
    const fetchOrder = async () => {
      const token = getAuthToken();
      if (!token) {
        toast.error(t('auth.session_expired'));
        setLoading(false);
        return;
      }

      try {
        const response = await apiServerClient.fetch(`/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch order (${response.status})`);
        }

        const result = await response.json();
        setOrder(result);
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error(t('order_details.load_error'));
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, t]);

  const handleCopyTracking = () => {
    const trackingNumber = getOrderTrackingNumber(order);

    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      toast.success(t('order_details.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getOrderStatusLabel = (status) => {
    const key = `orders.status_${status}`;
    const translated = t(key);
    return translated === key ? (status || t('orders.status_processing')) : translated;
  };

  const handleDownloadShippingLabel = () => {
    if (order?.dhl_label_pdf) {
      downloadBase64Pdf(order.dhl_label_pdf, `DHL_Label_${order.order_number || order.id}.pdf`);
      return;
    }

    if (order?.dhl_label_url) {
      window.open(order.dhl_label_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadReturnLabel = async () => {
    if (!order?.return_request?.id) return;

    const token = getAuthToken();
    if (!token) {
      toast.error(t('auth.session_expired'));
      return;
    }

    setDownloadingReturnLabel(true);
    try {
      const response = await apiServerClient.fetch(`/returns/${order.return_request.id}/label-pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Return label request failed with status ${response.status}`);
      }

      const blob = await response.blob();
      triggerPdfDownload(blob, `Return_Label_${order.order_number || order.id}.pdf`);
    } catch (error) {
      console.error('Return label download failed:', error);
      toast.error(language === 'EN' ? 'Return label could not be downloaded.' : 'Retourenlabel konnte nicht geladen werden.');
    } finally {
      setDownloadingReturnLabel(false);
    }
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    const token = getAuthToken();
    if (!token) {
      toast.error(t('auth.session_expired'));
      return;
    }

    setSubmittingReview(true);
    try {
      const result = await createCustomerReview({
        token,
        orderId: order.id,
        rating: reviewRating,
        body: reviewBody,
      });

      setOrder((current) => ({
        ...current,
        review: result.review,
        can_review: false,
      }));
      setReviewBody('');
      toast.success(copy.reviewSubmitted);
    } catch (error) {
      if (error.status === 409 && error.data?.review) {
        setOrder((current) => ({
          ...current,
          review: error.data.review,
          can_review: false,
        }));
        toast.info(copy.reviewAlreadySubmitted);
        return;
      }

      console.error('Customer review submit failed:', error);
      toast.error(copy.reviewError);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--muted-bg))]">{t('order_details.loading')}</div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--muted-bg))]">{t('order_details.not_found')}</div>;
  }

  const createdDate = new Date(order.created);
  const minDelivery = new Date(createdDate);
  minDelivery.setDate(minDelivery.getDate() + 5);
  const maxDelivery = new Date(createdDate);
  maxDelivery.setDate(maxDelivery.getDate() + 7);

  const shippingAddress = parseShippingAddress(order.shipping_address);
  const trackingNumber = getOrderTrackingNumber(order);
  const product = order.product || null;
  const items = product
    ? [
      {
        id: product.id,
        name: product.name,
        price: Number(order.price ?? product.price ?? 0),
        quantity: Number(order.quantity ?? 1),
      },
    ]
    : [];
  const isMarketplaceOrder = order.product_type !== 'shop';
  const claimDeadline = new Date(createdDate.getTime() + (2 * 24 * 60 * 60 * 1000));
  const isInsideClaimWindow = isMarketplaceOrder && claimDeadline.getTime() >= Date.now();
  const currentReturn = order.return_request || null;
  const currentReview = order.review || null;
  const canReview = order.can_review === true;
  const reviewStatusLabel = currentReview?.status === 'approved'
    ? copy.statusApproved
    : currentReview?.status === 'rejected'
      ? copy.statusRejected
      : copy.statusPending;

  return (
    <>
      <Helmet>
        <title>{t('order_details.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/my-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-[#0000FF] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('order_details.back_orders')}
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('order_details.title')} #{order.order_number || order.id.substring(0, 8)}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(order.created).toLocaleDateString(locale, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <Badge className="text-sm px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-[var(--radius-lg)] shadow-sm border border-[hsl(var(--border))] md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-5 h-5 text-[#0000FF]" />
                <h2 className="text-lg font-semibold">{t('order_details.tracking_title')}</h2>
              </div>

              {trackingNumber ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('orders.tracking')}</p>
                    <p className="font-mono text-lg font-medium">{trackingNumber}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {hasOrderLabel(order) && (
                      <Button
                        variant="outline"
                        className="gap-2 shrink-0"
                        onClick={handleDownloadShippingLabel}
                      >
                        <Download className="w-4 h-4" />
                        {copy.shippingLabel}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleCopyTracking} className="gap-2 shrink-0">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? t('order_details.copied') : t('order_details.copy_tracking')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-yellow-800 text-sm" title={getOrderLabelIssue(order)}>
                  {getOrderLabelText(order, language) || t('order_details.tracking_pending')}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-muted-foreground mb-1">{t('order_details.estimated_delivery')}</p>
                <p className="font-medium">
                  {minDelivery.toLocaleDateString(locale)} - {maxDelivery.toLocaleDateString(locale)}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[var(--radius-lg)] shadow-sm border border-[hsl(var(--border))]">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-[#0000FF]" />
                <h2 className="text-lg font-semibold">{t('order_details.shipping_address')}</h2>
              </div>
              <div className="text-sm space-y-1 text-gray-700">
                <p className="font-medium text-gray-900">
                  {shippingAddress.name || shippingAddress.fullName || shippingAddress.name1 || t('order_details.no_name')}
                </p>
                <p>{shippingAddress.street || shippingAddress.addressStreet || shippingAddress.address || t('order_details.no_street')}</p>
                <p>
                  {shippingAddress.postalCode || shippingAddress.postal_code || shippingAddress.zip || ''}{' '}
                  {shippingAddress.city || ''}
                </p>
                <p>{shippingAddress.country || 'DE'}</p>
                {shippingAddress.email && <p className="pt-2 text-muted-foreground">{shippingAddress.email}</p>}
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="w-5 h-5 text-[#0000FF]" />
              <h2 className="text-lg font-semibold">{copy.returnTitle}</h2>
            </div>

            {currentReturn ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">{currentReturn.status || 'Pending'}</Badge>
                  {currentReturn.has_label && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={handleDownloadReturnLabel}
                      disabled={downloadingReturnLabel}
                    >
                      <Download className="w-4 h-4" />
                      {copy.returnLabel}
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.returnReason}</p>
                    <p className="mt-1 text-sm text-[#151515]">{currentReturn.reason || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.returnStatus}</p>
                    <p className="mt-1 text-sm text-[#151515]">{currentReturn.status || 'Pending'}</p>
                  </div>
                  {currentReturn.details && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.returnDetails}</p>
                      <p className="mt-1 text-sm leading-6 text-[#151515]">{currentReturn.details}</p>
                    </div>
                  )}
                  {currentReturn.admin_notes && (
                    <div className="md:col-span-2 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{copy.adminNotes}</p>
                      <p className="mt-1 text-sm leading-6 text-[#151515]">{currentReturn.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[#666666]">{copy.noReturnYet}</p>

                {isMarketplaceOrder ? (
                  <div className="rounded-[8px] border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm leading-6 text-[#1f3b73]">{copy.marketplaceBody}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#3157a4]">
                      {copy.claimDeadline}: {claimDeadline.toLocaleDateString(locale)}
                    </p>
                    <Link
                      to={`/widerrufsformular?mode=marketplace&orderId=${encodeURIComponent(order.id)}`}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0000FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0000CC]"
                    >
                      {isInsideClaimWindow ? copy.marketplaceClaim : copy.marketplaceForm}
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-[8px] border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm leading-6 text-[#694100]">{copy.shopBody}</p>
                    <Link
                      to={`/widerrufsformular?mode=shop&orderId=${encodeURIComponent(order.order_number || order.id)}`}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0000FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0000CC]"
                    >
                      {copy.shopReturn}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-8 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-[#0000FF]" />
              <h2 className="text-lg font-semibold">{copy.reviewTitle}</h2>
            </div>

            {currentReview ? (
              <div className="rounded-[8px] border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1f3b73]">{copy.yourReview}</p>
                  <Badge variant="outline" className="border-blue-200 bg-white text-[#0000FF]">{reviewStatusLabel}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-1" aria-label={`${currentReview.rating} / 5`}>
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${index < Number(currentReview.rating || 0) ? 'fill-[#0000FF] text-[#0000FF]' : 'fill-slate-200 text-slate-200'}`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#1f3b73]">{currentReview.body}</p>
              </div>
            ) : canReview ? (
              <form className="space-y-5" onSubmit={handleSubmitReview}>
                <p className="text-sm leading-6 text-[#666666]">{copy.reviewIntro}</p>
                <div>
                  <Label className="mb-2 block">{copy.reviewRating}</Label>
                  <div className="flex items-center gap-1" role="radiogroup" aria-label={copy.reviewRating}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={reviewRating === value}
                        className="rounded-md p-1 text-[#0000FF] transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF]"
                        onClick={() => setReviewRating(value)}
                      >
                        <Star className={`h-6 w-6 ${value <= reviewRating ? 'fill-[#0000FF]' : 'fill-slate-200 text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="customer-review-body" className="mb-2 block">{copy.reviewComment}</Label>
                  <Textarea
                    id="customer-review-body"
                    required
                    minLength={REVIEW_MIN_LENGTH}
                    maxLength={REVIEW_MAX_LENGTH}
                    rows={4}
                    value={reviewBody}
                    onChange={(event) => setReviewBody(event.target.value)}
                    placeholder={copy.reviewPlaceholder}
                  />
                  <p className={`mt-2 text-xs ${reviewBody.trim().length > 0 && reviewBody.trim().length < REVIEW_MIN_LENGTH ? 'text-amber-700' : 'text-[#666666]'}`}>
                    {copy.reviewLengthHint} ({reviewBody.trim().length}/{REVIEW_MIN_LENGTH})
                  </p>
                </div>
                <Button type="submit" disabled={submittingReview || reviewBody.trim().length < REVIEW_MIN_LENGTH} className="bg-[#0000FF] hover:bg-[#0000CC] disabled:cursor-not-allowed disabled:opacity-60">
                  {submittingReview ? copy.submittingReview : copy.submitReview}
                </Button>
              </form>
            ) : (
              <p className="text-sm leading-6 text-[#666666]">{copy.reviewNotReady}</p>
            )}
          </div>

          <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-[hsl(var(--border))] overflow-hidden">
            <div className="p-6 border-b border-[hsl(var(--border))] flex items-center gap-3">
              <Package className="w-5 h-5 text-[#0000FF]" />
              <h2 className="text-lg font-semibold">{t('order_details.products')}</h2>
            </div>
            <div className="divide-y divide-[hsl(var(--border))]">
              {items.length > 0 ? (
                items.map((item) => (
                  <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center shrink-0 border border-gray-200">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name || t('orders.product')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t('common.quantity')}: {item.quantity || 1}</p>
                    </div>
                    <div className="font-medium text-lg shrink-0">
                      EUR {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">{t('order_details.no_products')}</div>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t border-[hsl(var(--border))] flex justify-between items-center">
              <span className="font-medium text-gray-600">{t('order_details.total_sum')}</span>
              <span className="text-xl font-bold text-[#0000FF]">EUR {Number(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default OrderDetailsPage;
