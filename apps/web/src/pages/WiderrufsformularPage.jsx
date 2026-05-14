import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBag, AlertCircle, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { getAuthToken } from '@/lib/getAuthToken.js';

const triggerPdfDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const WiderrufsformularPage = () => {
  const { currentUser } = useAuth();
  const { language } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingLabelId, setDownloadingLabelId] = useState('');
  const [shopLookup, setShopLookup] = useState(searchParams.get('orderId') || '');
  const [shopResult, setShopResult] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [marketplaceOrder, setMarketplaceOrder] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    details: '',
  });

  const mode = searchParams.get('mode') === 'marketplace' ? 'marketplace' : 'shop';

  const copy = useMemo(() => (
    language === 'EN'
      ? {
        eyebrow: 'Returns',
        title: mode === 'marketplace' ? 'Marketplace claim form' : 'Shop return form',
        description: mode === 'marketplace'
          ? 'Use this form for marketplace claims. Inside the 2-day window it is treated as a claim; afterwards it becomes an admin-reviewed case.'
          : 'Enter your shop order reference, load the purchased items, and select the product you want to return.',
        authTitle: 'Sign in required',
        authBody: 'You need to sign in to look up shop orders or submit a marketplace claim.',
        authCta: 'Go to sign in',
        shopLookupLabel: 'Order reference',
        shopLookupHint: 'You can use an order number, order ID, or a related checkout reference.',
        shopLookupButton: 'Load order',
        shopNoResult: 'No matching shop order was found for this account.',
        selectProduct: 'Select the product you want to return',
        selectedOrder: 'Selected order',
        reasonLabel: 'Reason',
        detailsLabel: 'Details',
        detailsPlaceholder: 'Add the relevant facts for admin review or for the shop return request.',
        submitButton: 'Submit return request',
        submittingButton: 'Submitting...',
        marketplaceOrderTitle: 'Marketplace order',
        marketplaceHint: 'If the 2-day claim window has already passed, admin will review the form before a return is approved.',
        marketplaceStartHint: 'Open this page from the relevant order to start a marketplace claim.',
        currentRequest: 'Current request',
        currentStatus: 'Status',
        labelButton: 'Download return label',
        reasonRequired: 'A reason is required.',
        createSuccess: 'Return request submitted.',
        lookupError: 'The order could not be loaded.',
        submitError: 'The return request could not be submitted.',
        downloadError: 'The return label could not be downloaded.',
        marketplaceClaimDeadline: 'Claim deadline',
        alreadyExists: 'A return request already exists for this product.',
      }
      : {
        eyebrow: 'Retouren',
        title: mode === 'marketplace' ? 'Marktplatz-Reklamationsformular' : 'Shop-Retourenformular',
        description: mode === 'marketplace'
          ? 'Nutze dieses Formular für Marktplatz-Reklamationen. Innerhalb von 2 Tagen wird es als Claim behandelt, danach als Admin-Prüffall.'
          : 'Gib deine Shop-Bestellreferenz ein, lade die gekauften Artikel und wähle das Produkt aus, das du zurückgeben möchtest.',
        authTitle: 'Anmeldung erforderlich',
        authBody: 'Du musst angemeldet sein, um Shop-Bestellungen nachzuschlagen oder eine Marktplatz-Reklamation abzugeben.',
        authCta: 'Zur Anmeldung',
        shopLookupLabel: 'Bestellreferenz',
        shopLookupHint: 'Du kannst Bestellnummer, Bestell-ID oder eine zugehörige Checkout-Referenz verwenden.',
        shopLookupButton: 'Bestellung laden',
        shopNoResult: 'Für dieses Konto wurde keine passende Shop-Bestellung gefunden.',
        selectProduct: 'Wähle das Produkt aus, das du zurückgeben möchtest',
        selectedOrder: 'Ausgewählte Bestellung',
        reasonLabel: 'Grund',
        detailsLabel: 'Details',
        detailsPlaceholder: 'Beschreibe die relevanten Fakten für die Admin-Prüfung oder die Shop-Retoure.',
        submitButton: 'Retourenanfrage absenden',
        submittingButton: 'Wird gesendet...',
        marketplaceOrderTitle: 'Marktplatz-Bestellung',
        marketplaceHint: 'Wenn die 2-Tage-Frist bereits abgelaufen ist, prüft die Admin die Anfrage vor einer Freigabe.',
        marketplaceStartHint: 'Öffne diese Seite aus der passenden Bestellung, um eine Marktplatz-Reklamation zu starten.',
        currentRequest: 'Aktuelle Anfrage',
        currentStatus: 'Status',
        labelButton: 'Retourenlabel herunterladen',
        reasonRequired: 'Ein Grund ist erforderlich.',
        createSuccess: 'Retourenanfrage wurde erfasst.',
        lookupError: 'Die Bestellung konnte nicht geladen werden.',
        submitError: 'Die Retourenanfrage konnte nicht gesendet werden.',
        downloadError: 'Das Retourenlabel konnte nicht geladen werden.',
        marketplaceClaimDeadline: 'Reklamationsfrist',
        alreadyExists: 'Für dieses Produkt gibt es bereits eine Retourenanfrage.',
      }
  ), [language, mode]);

  const token = getAuthToken();

  const fetchMarketplaceOrder = async (id) => {
    if (!id || !token) return;

    setLoadingLookup(true);
    try {
      const response = await apiServerClient.fetch(`/orders/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Marketplace order lookup failed with status ${response.status}`);
      }

      const data = await response.json();
      setMarketplaceOrder(data);
    } catch (error) {
      console.error('Marketplace return order lookup failed:', error);
      toast.error(copy.lookupError);
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleShopLookup = async () => {
    if (!shopLookup.trim() || !token) return;

    setLoadingLookup(true);
    try {
      const response = await apiServerClient.fetch(`/returns/shop-lookup/${encodeURIComponent(shopLookup.trim())}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Shop lookup failed with status ${response.status}`);
      }

      const data = await response.json();
      setShopResult(data);
      const firstAvailable = data.items.find((item) => !item.return_request) || data.items[0];
      setSelectedOrderId(firstAvailable?.id || '');
    } catch (error) {
      console.error('Shop return lookup failed:', error);
      setShopResult({ items: [] });
      toast.error(copy.lookupError);
    } finally {
      setLoadingLookup(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !token) return;

    if (mode === 'marketplace') {
      const orderId = searchParams.get('orderId');
      if (orderId) {
        fetchMarketplaceOrder(orderId);
      }
      return;
    }

    if (shopLookup.trim()) {
      handleShopLookup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, token, mode]);

  const selectedShopItem = shopResult?.items?.find((item) => item.id === selectedOrderId) || null;
  const activeRequest = mode === 'marketplace' ? marketplaceOrder?.return_request : selectedShopItem?.return_request;
  const submitOrderId = mode === 'marketplace' ? marketplaceOrder?.id : selectedOrderId;

  const handleDownloadReturnLabel = async (returnId) => {
    if (!returnId || !token) return;

    setDownloadingLabelId(returnId);
    try {
      const response = await apiServerClient.fetch(`/returns/${returnId}/label-pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Return label download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      triggerPdfDownload(blob, `Return_Label_${returnId}.pdf`);
    } catch (error) {
      console.error('Return label download failed:', error);
      toast.error(copy.downloadError);
    } finally {
      setDownloadingLabelId('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!submitOrderId || !formData.reason.trim()) {
      toast.error(copy.reasonRequired);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiServerClient.fetch('/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: submitOrderId,
          reason: formData.reason.trim(),
          details: formData.details.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Return creation failed with status ${response.status}`);
      }

      toast.success(copy.createSuccess);
      setFormData({ reason: '', details: '' });

      if (mode === 'marketplace') {
        setMarketplaceOrder((prev) => prev ? { ...prev, return_request: data.item } : prev);
      } else {
        setShopResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) => (
              item.id === submitOrderId
                ? { ...item, return_request: data.item }
                : item
            )),
          };
        });
      }
    } catch (error) {
      console.error('Return request submission failed:', error);
      toast.error(error.message || copy.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{copy.title} - Zahnibörse</title>
      </Helmet>
      <PageShell
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        maxWidth="max-w-4xl"
      >
        {!currentUser ? (
          <ContentPanel className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#f1f1ff] text-[#0000FF]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{copy.authTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-[hsl(var(--secondary-text))]">
                  {copy.authBody}
                </p>
                <Link
                  to="/auth"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0000FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0000CC]"
                >
                  {copy.authCta}
                </Link>
              </div>
            </div>
          </ContentPanel>
        ) : (
          <div className="space-y-6">
            {mode === 'marketplace' ? (
              <ContentPanel>
                <div className="flex items-center gap-3 mb-6">
                  <RotateCcw className="h-5 w-5 text-[#0000FF]" />
                  <h2 className="text-xl font-semibold">{copy.marketplaceOrderTitle}</h2>
                </div>

                {loadingLookup ? (
                  <p className="text-sm text-[hsl(var(--secondary-text))]">
                    {language === 'EN' ? 'Loading order...' : 'Bestellung wird geladen...'}
                  </p>
                ) : marketplaceOrder ? (
                  <div className="space-y-6">
                    <div className="rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--muted-bg))] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            #{marketplaceOrder.order_number || marketplaceOrder.id}
                          </p>
                          <p className="mt-1 text-sm text-[hsl(var(--secondary-text))]">
                            {marketplaceOrder.product?.name || '-'}
                          </p>
                        </div>
                        <Badge variant="outline">{marketplaceOrder.status || 'paid'}</Badge>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[hsl(var(--secondary-text))]">
                        {copy.marketplaceHint}
                      </p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#3157a4]">
                        {copy.marketplaceClaimDeadline}:{' '}
                        {new Date(new Date(marketplaceOrder.created).getTime() + (2 * 24 * 60 * 60 * 1000)).toLocaleDateString(language === 'EN' ? 'en-US' : 'de-DE')}
                      </p>
                    </div>

                    {activeRequest ? (
                      <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-semibold">{copy.currentRequest}</p>
                          <Badge variant="outline">{activeRequest.status || 'Pending'}</Badge>
                          {activeRequest.has_label && (
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              onClick={() => handleDownloadReturnLabel(activeRequest.id)}
                              disabled={downloadingLabelId === activeRequest.id}
                            >
                              <Download className="h-4 w-4" />
                              {copy.labelButton}
                            </Button>
                          )}
                        </div>
                        <p className="mt-3 text-sm text-[hsl(var(--secondary-text))]">{activeRequest.reason}</p>
                        {activeRequest.details && (
                          <p className="mt-2 text-sm text-[hsl(var(--secondary-text))]">{activeRequest.details}</p>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="marketplace-reason">{copy.reasonLabel}</Label>
                          <Input
                            id="marketplace-reason"
                            value={formData.reason}
                            onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="marketplace-details">{copy.detailsLabel}</Label>
                          <Textarea
                            id="marketplace-details"
                            rows={5}
                            value={formData.details}
                            placeholder={copy.detailsPlaceholder}
                            onChange={(event) => setFormData((prev) => ({ ...prev, details: event.target.value }))}
                          />
                        </div>
                        <Button type="submit" className="bg-[#0000FF] hover:bg-[#0000CC] text-white" disabled={submitting}>
                          {submitting ? copy.submittingButton : copy.submitButton}
                        </Button>
                      </form>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{copy.marketplaceStartHint}</p>
                )}
              </ContentPanel>
            ) : (
              <>
                <ContentPanel>
                  <div className="flex items-center gap-3 mb-6">
                    <ShoppingBag className="h-5 w-5 text-[#0000FF]" />
                    <h2 className="text-xl font-semibold">{copy.shopLookupLabel}</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="shop-order-lookup">{copy.shopLookupLabel}</Label>
                      <Input
                        id="shop-order-lookup"
                        value={shopLookup}
                        onChange={(event) => setShopLookup(event.target.value)}
                        placeholder="ORD-..."
                      />
                      <p className="text-sm text-[hsl(var(--secondary-text))]">{copy.shopLookupHint}</p>
                    </div>
                    <Button type="button" className="gap-2 bg-[#0000FF] hover:bg-[#0000CC] text-white" onClick={handleShopLookup} disabled={loadingLookup || !shopLookup.trim()}>
                      <Search className="h-4 w-4" />
                      {copy.shopLookupButton}
                    </Button>
                  </div>
                </ContentPanel>

                {shopResult && (
                  <ContentPanel>
                    {shopResult.items.length === 0 ? (
                      <p className="text-sm leading-6 text-[hsl(var(--secondary-text))]">{copy.shopNoResult}</p>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-semibold">{copy.selectProduct}</h2>
                          <p className="mt-2 text-sm leading-6 text-[hsl(var(--secondary-text))]">
                            {copy.selectedOrder}: #{shopResult.order_number || shopResult.lookup}
                          </p>
                        </div>

                        <div className="grid gap-3">
                          {shopResult.items.map((item) => {
                            const isSelected = item.id === selectedOrderId;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedOrderId(item.id)}
                                className={`rounded-[8px] border p-4 text-left transition-colors ${isSelected ? 'border-[#0000FF] bg-[#f4f4ff]' : 'border-[hsl(var(--border))] bg-white hover:border-[#0000FF]/35'}`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-[hsl(var(--foreground))]">{item.product?.name || item.id}</p>
                                    <p className="mt-1 text-sm text-[hsl(var(--secondary-text))]">#{item.order_number || item.id}</p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{item.status || 'paid'}</Badge>
                                    {item.return_request && <Badge>{copy.alreadyExists}</Badge>}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedShopItem?.return_request ? (
                          <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-sm font-semibold">{copy.currentRequest}</p>
                              <Badge variant="outline">{selectedShopItem.return_request.status || 'Pending'}</Badge>
                              {selectedShopItem.return_request.has_label && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => handleDownloadReturnLabel(selectedShopItem.return_request.id)}
                                  disabled={downloadingLabelId === selectedShopItem.return_request.id}
                                >
                                  <Download className="h-4 w-4" />
                                  {copy.labelButton}
                                </Button>
                              )}
                            </div>
                            <p className="mt-3 text-sm text-[hsl(var(--secondary-text))]">{selectedShopItem.return_request.reason}</p>
                            {selectedShopItem.return_request.details && (
                              <p className="mt-2 text-sm text-[hsl(var(--secondary-text))]">{selectedShopItem.return_request.details}</p>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                              <Label htmlFor="shop-reason">{copy.reasonLabel}</Label>
                              <Input
                                id="shop-reason"
                                value={formData.reason}
                                onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="shop-details">{copy.detailsLabel}</Label>
                              <Textarea
                                id="shop-details"
                                rows={5}
                                value={formData.details}
                                placeholder={copy.detailsPlaceholder}
                                onChange={(event) => setFormData((prev) => ({ ...prev, details: event.target.value }))}
                              />
                            </div>
                            <Button type="submit" className="bg-[#0000FF] hover:bg-[#0000CC] text-white" disabled={submitting || !selectedOrderId}>
                              {submitting ? copy.submittingButton : copy.submitButton}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                  </ContentPanel>
                )}
              </>
            )}
          </div>
        )}
      </PageShell>
    </>
  );
};

export default WiderrufsformularPage;
