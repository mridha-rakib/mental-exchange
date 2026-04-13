import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Eye, RefreshCw, AlertCircle, Download, MapPin } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';

const MyOrdersPage = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const result = await pb.collection('orders').getList(1, 100, {
        filter: `buyer_id="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });

      const fetchedOrders = result.items;
      const productIds = [...new Set(fetchedOrders.map(o => o.product_id).filter(Boolean))];

      let productsMap = {};
      if (productIds.length > 0) {
        const productsFilter = productIds.map(id => `id="${id}"`).join(' || ');
        const productsResult = await pb.collection('products').getFullList({
          filter: productsFilter,
          $autoCancel: false
        });

        productsMap = productsResult.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      const enrichedOrders = fetchedOrders.map(order => ({
        ...order,
        product: productsMap[order.product_id] || null
      }));

      setOrders(enrichedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(t('orders.load_error'));
    } finally {
      setLoading(false);
    }
  }, [currentUser, t]);

  useEffect(() => {
    if (!currentUser) return;

    fetchOrders();

    const onFocus = () => {
      fetchOrders();
    };

    window.addEventListener('focus', onFocus);

    const intervalId = window.setInterval(() => {
      fetchOrders();
    }, 5000);

    pb.collection('orders').subscribe('*', function (e) {
      if (e.record?.buyer_id === currentUser.id) {
        fetchOrders();
      }
    });

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
      pb.collection('orders').unsubscribe('*');
    };
  }, [fetchOrders, currentUser]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">{t('orders.status_delivered')}</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">{t('orders.status_shipped')}</Badge>;
      case 'processing':
      case 'paid':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">{t('orders.status_processing')}</Badge>;
      default:
        return <Badge variant="outline">{status || t('orders.status_pending')}</Badge>;
    }
  };

  const formatAddress = (addressData) => {
    if (!addressData) return t('orders.no_address');
    try {
      const addr = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;
      return `${addr.name || addr.name1 || ''}, ${addr.street || addr.addressStreet || ''}, ${addr.postalCode || addr.postal_code || addr.zip || ''} ${addr.city || ''}`
        .replace(/^[,\s]+|[,\s]+$/g, '')
        .replace(/,\s*,/g, ',');
    } catch {
      return t('orders.invalid_address');
    }
  };

  const handleDownloadLabel = (e, order) => {
    e.stopPropagation();

    const pdfBase64 = order.dhl_label_pdf;

    if (pdfBase64) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `DHL_Label_${order.order_number || order.id}.pdf`;
      link.click();
      return;
    }

    if (order.dhl_label_url) {
      window.open(order.dhl_label_url, '_blank');
      return;
    }

    toast.error(t('orders.no_label'));
  };

  return (
    <>
      <Helmet>
        <title>{t('orders.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-[#0000FF]" />
              <h1 className="text-3xl font-bold tracking-tight">{t('orders.title')}</h1>
            </div>
          </div>

          <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-[hsl(var(--border))] overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchOrders} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> {t('orders.retry')}
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('orders.empty')}</h3>
                <Link to="/marketplace">
                  <Button className="mt-4 bg-[#0000FF] hover:bg-[#0000CC] text-white">
                    {t('orders.shop_now')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="whitespace-nowrap">{t('orders.id')}</TableHead>
                      <TableHead>{t('orders.product')}</TableHead>
                      <TableHead>{t('orders.total')}</TableHead>
                      <TableHead>{t('orders.status')}</TableHead>
                      <TableHead>{t('orders.tracking_short')}</TableHead>
                      <TableHead>{t('orders.delivery_address')}</TableHead>
                      <TableHead className="text-right">{t('orders.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const hasLabel = !!(order.dhl_label_pdf || order.dhl_label_url);
                      const trackingNumber = order.tracking_number || order.dhl_tracking_number;

                      return (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors group"
                          onClick={() => navigate(`/order-details/${order.id}`)}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {order.order_number || order.id.substring(0, 8)}
                            <div className="text-xs text-muted-foreground font-normal mt-1">
                              {new Date(order.created).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium line-clamp-1 max-w-[200px]" title={order.product?.name || order.product_id}>
                              {order.product?.name || t('orders.unknown_product')}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            €{order.total_amount?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {trackingNumber ? (
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded border">
                                {trackingNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-1.5 max-w-[200px]">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <span className="text-xs text-muted-foreground line-clamp-2" title={formatAddress(order.shipping_address)}>
                                {formatAddress(order.shipping_address)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {hasLabel && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={(e) => handleDownloadLabel(e, order)}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">Label</span>
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('orders.view')}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default MyOrdersPage;
