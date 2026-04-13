import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, CheckCircle2, Truck, MapPin, Package, Calendar } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { toast } from 'sonner';

const parseShippingAddress = (rawAddress) => {
  if (!rawAddress) return {};
  if (typeof rawAddress === 'object') return rawAddress;

  try {
    return JSON.parse(rawAddress);
  } catch {
    return {};
  }
};

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const result = await pb.collection('orders').getOne(orderId, {
          $autoCancel: false,
        });

        setOrder(result);

        if (result.product_id) {
          try {
            const productRecord = await pb.collection('products').getOne(result.product_id, {
              $autoCancel: false,
            });
            setProduct(productRecord);
          } catch (productError) {
            console.error('Error fetching product for order details:', productError);
            setProduct(null);
          }
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error(t('order_details.load_error'));
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchOrder();
  }, [orderId, t]);

  const handleCopyTracking = () => {
    const trackingNumber = order?.tracking_number || order?.dhl_tracking_number;

    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      toast.success(t('order_details.copied'));
      setTimeout(() => setCopied(false), 2000);
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
  const trackingNumber = order.tracking_number || order.dhl_tracking_number || '';

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
                {new Date(order.created).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <Badge className="text-sm px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
              {order.status || t('orders.status_processing')}
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
                  <Button variant="outline" onClick={handleCopyTracking} className="gap-2 shrink-0">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? t('order_details.copied') : t('order_details.copy_tracking')}
                  </Button>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-yellow-800 text-sm">
                  {t('order_details.tracking_pending')}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-muted-foreground mb-1">{t('order_details.estimated_delivery')}</p>
                <p className="font-medium">
                  {minDelivery.toLocaleDateString('de-DE')} - {maxDelivery.toLocaleDateString('de-DE')}
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
                      €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">{t('order_details.no_products')}</div>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t border-[hsl(var(--border))] flex justify-between items-center">
              <span className="font-medium text-gray-600">{t('order_details.total_sum')}</span>
              <span className="text-xl font-bold text-[#0000FF]">€{Number(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default OrderDetailsPage;
