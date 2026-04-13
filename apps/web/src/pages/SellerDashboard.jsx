import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, DollarSign, Settings, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const SellerDashboard = () => {
  const { currentUser } = useAuth();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    activeProducts: 0,
    soldProducts: 0,
    totalEarnings: 0,
    pendingEarnings: 0
  });
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.id) return;
      
      setLoading(true);
      try {
        // Fetch Products
        const productsResult = await pb.collection('products').getList(1, 50, {
          filter: `seller_id = "${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        
        // Fetch Orders
        const ordersResult = await pb.collection('orders').getList(1, 50, {
          filter: `seller_id = "${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        
        // Fetch Earnings
        const earningsResult = await pb.collection('seller_earnings').getList(1, 50, {
          filter: `seller_id = "${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });

        setProducts(productsResult.items);
        setOrders(ordersResult.items);
        setEarnings(earningsResult.items);

        // Calculate Stats
        const pending = productsResult.items.filter(p => p.status === 'pending_verification').length;
        const active = productsResult.items.filter(p => p.status === 'active').length;
        const sold = productsResult.items.filter(p => p.status === 'sold').length;
        
        const totalEarned = earningsResult.items
          .filter(e => e.status === 'confirmed')
          .reduce((sum, e) => sum + (e.net_amount || 0), 0);
          
        const pendingEarned = earningsResult.items
          .filter(e => e.status === 'pending')
          .reduce((sum, e) => sum + (e.net_amount || 0), 0);

        setStats({
          totalProducts: productsResult.totalItems,
          pendingProducts: pending,
          activeProducts: active,
          soldProducts: sold,
          totalEarnings: totalEarned,
          pendingEarnings: pendingEarned
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('seller.status_active')}</Badge>;
      case 'pending_verification': return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">{t('seller.status_pending')}</Badge>;
      case 'sold': return <Badge variant="secondary">{t('seller.status_sold')}</Badge>;
      case 'rejected': return <Badge variant="destructive">{t('seller_dashboard.status_rejected')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('seller_dashboard.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('seller_dashboard.title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('seller_dashboard.welcome', { name: currentUser?.seller_username || currentUser?.name || '' })}
              </p>
            </div>
            <Link to="/seller/new-product">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t('seller.new_product')}
              </Button>
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('seller_dashboard.products')}</p>
                  {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                    <h3 className="text-2xl font-bold">{stats.totalProducts}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('seller.status_pending')}</p>
                  {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                    <h3 className="text-2xl font-bold">{stats.pendingProducts}</h3>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('seller.status_sold')}</p>
                  {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                    <h3 className="text-2xl font-bold">{stats.soldProducts}</h3>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('seller_dashboard.earnings')}</p>
                  {loading ? <Skeleton className="h-8 w-24 mt-1" /> : (
                    <h3 className="text-2xl font-bold">€{stats.totalEarnings.toFixed(2)}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="mb-6 bg-white border shadow-sm">
              <TabsTrigger value="products" className="gap-2"><Package className="w-4 h-4" /> {t('seller_dashboard.products')}</TabsTrigger>
              <TabsTrigger value="orders" className="gap-2"><ShoppingBag className="w-4 h-4" /> {t('orders.title')}</TabsTrigger>
              <TabsTrigger value="earnings" className="gap-2"><DollarSign className="w-4 h-4" /> {t('seller_dashboard.earnings')}</TabsTrigger>
              <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> {t('seller_dashboard.settings')}</TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('seller_dashboard.my_products')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : products.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">{t('orders.product')}</th>
                            <th className="px-4 py-3">{t('seller.price')}</th>
                            <th className="px-4 py-3">{t('seller.status')}</th>
                            <th className="px-4 py-3">{t('seller_dashboard.created_at')}</th>
                            <th className="px-4 py-3 rounded-tr-lg text-right">{t('seller.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(product => (
                            <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-4 font-medium">{product.name}</td>
                              <td className="px-4 py-4">€{product.price.toFixed(2)}</td>
                              <td className="px-4 py-4">{getStatusBadge(product.status)}</td>
                              <td className="px-4 py-4 text-muted-foreground">
                                {new Date(product.created).toLocaleDateString(language === 'EN' ? 'en-US' : 'de-DE')}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <Link to={`/product/${product.id}`} className="text-primary hover:underline mr-4">{t('common.view')}</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-medium">{t('marketplace.empty_title')}</h3>
                      <p className="text-muted-foreground mt-1 mb-4">{t('seller.empty_items')}</p>
                      <Link to="/seller/new-product">
                        <Button>{t('seller.sell_first')}</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('seller_dashboard.orders_to_ship')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">{t('orders.id')}</th>
                            <th className="px-4 py-3">{t('orders.date')}</th>
                            <th className="px-4 py-3">{t('orders.total')}</th>
                            <th className="px-4 py-3">{t('orders.status')}</th>
                            <th className="px-4 py-3 rounded-tr-lg text-right">{t('seller.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(order => (
                            <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-4 font-medium">{order.order_number}</td>
                              <td className="px-4 py-4 text-muted-foreground">
                                {new Date(order.created).toLocaleDateString(language === 'EN' ? 'en-US' : 'de-DE')}
                              </td>
                              <td className="px-4 py-4">€{order.total_amount?.toFixed(2)}</td>
                              <td className="px-4 py-4">
                                <Badge variant={order.status === 'pending' ? 'outline' : 'secondary'}>
                                  {order.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <Button variant="ghost" size="sm">{t('shop.details')}</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-medium">{t('seller_dashboard.no_orders')}</h3>
                      <p className="text-muted-foreground mt-1">{t('seller_dashboard.no_open_orders')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('seller_dashboard.earnings_payouts')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-6 mb-8 p-6 bg-muted/30 rounded-[8px] border">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{t('seller_dashboard.available_balance')}</p>
                      <p className="text-3xl font-bold text-primary">€{stats.totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className="hidden sm:block w-px bg-border"></div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{t('seller_dashboard.pending_escrow')}</p>
                      <p className="text-3xl font-bold text-muted-foreground">€{stats.pendingEarnings.toFixed(2)}</p>
                    </div>
                    <div className="sm:ml-auto flex items-center">
                      <Button disabled={stats.totalEarnings <= 0}>{t('seller_dashboard.request_payout')}</Button>
                    </div>
                  </div>

                  <h3 className="font-medium mb-4">{t('seller_dashboard.transaction_history')}</h3>
                  {loading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : earnings.length > 0 ? (
                    <div className="space-y-3">
                      {earnings.map(earning => (
                        <div key={earning.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{t('seller_dashboard.sale_order', { order: earning.order_id.substring(0,8) })}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(earning.created).toLocaleDateString(language === 'EN' ? 'en-US' : 'de-DE')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">+ €{earning.net_amount?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {earning.status === 'confirmed' ? t('seller_dashboard.available') : t('orders.status_pending')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">{t('seller_dashboard.no_transactions')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('seller_dashboard.seller_profile')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{t('seller.username')}</p>
                      <p className="font-medium text-lg">{currentUser?.seller_username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{t('seller.status')}</p>
                      <Badge className="bg-green-100 text-green-800">{t('seller_dashboard.activated')}</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Link to="/profile">
                      <Button variant="outline">{t('seller_dashboard.edit_profile')}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </>
  );
};

export default SellerDashboard;
