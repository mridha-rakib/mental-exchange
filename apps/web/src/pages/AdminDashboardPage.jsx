import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  Users, Package, ShoppingCart, DollarSign, AlertCircle,
  RefreshCw, Search, Filter, MoreVertical, Edit, Trash2,
  Eye, CheckCircle, XCircle, Download, Store, ArrowUpRight,
  Settings, BarChart3, RotateCcw
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [tableProducts, setTableProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    shipping_fee: 4.99,
    service_fee: 1.99,
    transaction_fee_percentage: 7,
    verification_fee: 15,
  });

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [sellerSearch, setSellerSearch] = useState('');

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const [ordersRes, productsRes, usersRes, returnsRes, settingsRes] = await Promise.all([
        pb.collection('orders').getFullList({ sort: '-created', expand: 'buyer_id,seller_id,product_id', $autoCancel: false }),
        pb.collection('products').getFullList({ sort: '-created', expand: 'seller_id', $autoCancel: false }),
        pb.collection('users').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('returns').getFullList({ sort: '-created', expand: 'order_id,buyer_id', $autoCancel: false }).catch(() => []),
        pb.collection('admin_settings').getFirstListItem('', { $autoCancel: false }).catch(() => null)
      ]);
      setOrders(ordersRes);
      setProducts(productsRes);
      setUsers(usersRes);
      setReturns(returnsRes);
      setSettings(settingsRes);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (!silent) toast.error('Fehler beim Laden der Dashboard-Daten');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!settings) return;

    setSettingsForm({
      shipping_fee: settings.shipping_fee ?? 4.99,
      service_fee: settings.service_fee ?? 1.99,
      transaction_fee_percentage: settings.transaction_fee_percentage ?? settings.transaction_fee_percent ?? 7,
      verification_fee: settings.verification_fee ?? 15,
    });
  }, [settings]);

  const fetchTableProducts = useCallback(async () => {
    setIsProductsLoading(true);
    try {
      const params = new URLSearchParams();
      if (productSearch) params.append('search', productSearch);
      if (productCategoryFilter !== 'all') params.append('category', productCategoryFilter);
      if (productTypeFilter !== 'all') params.append('type', productTypeFilter);
      
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch(`/admin/products?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setTableProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Laden der Produkte: ' + error.message);
    } finally {
      setIsProductsLoading(false);
    }
  }, [productSearch, productCategoryFilter, productTypeFilter]);

  useEffect(() => {
    fetchData();
    fetchTableProducts();

    const subscriptions = [];

    pb.collection('products').subscribe('*', (e) => {
      if (e.action === 'create') {
        setProducts(prev => [e.record, ...prev]);
        setTableProducts(prev => [e.record, ...prev]);
        toast.success(`Neues Produkt: ${e.record.name}`);
      } else if (e.action === 'update') {
        setProducts(prev => prev.map(p => p.id === e.record.id ? e.record : p));
        setTableProducts(prev => prev.map(p => p.id === e.record.id ? e.record : p));
      } else if (e.action === 'delete') {
        setProducts(prev => prev.filter(p => p.id !== e.record.id));
        setTableProducts(prev => prev.filter(p => p.id !== e.record.id));
      }
    }).then(unsub => subscriptions.push(unsub)).catch(() => { });

    pb.collection('orders').subscribe('*', (e) => {
      if (e.action === 'create') {
        setOrders(prev => [e.record, ...prev]);
        toast.success('Neue Bestellung eingegangen!');
      } else if (e.action === 'update') {
        setOrders(prev => prev.map(o => o.id === e.record.id ? e.record : o));
      }
    }).then(unsub => subscriptions.push(unsub)).catch(() => { });

    pb.collection('users').subscribe('*', (e) => {
      if (e.action === 'create') {
        setUsers(prev => [e.record, ...prev]);
      } else if (e.action === 'update') {
        setUsers(prev => prev.map(u => u.id === e.record.id ? e.record : u));
      }
    }).then(unsub => subscriptions.push(unsub)).catch(() => { });

    return () => {
      subscriptions.forEach(unsub => { if (typeof unsub === 'function') unsub(); });
      pb.collection('products').unsubscribe('*').catch(() => { });
      pb.collection('orders').unsubscribe('*').catch(() => { });
      pb.collection('users').unsubscribe('*').catch(() => { });
    };
  }, [fetchData, fetchTableProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTableProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, productCategoryFilter, productTypeFilter]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const sellers = users.filter(u => u.is_seller);
    const activeOrders = orders.filter(o => ['paid', 'processing', 'shipped'].includes(o.status));
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    return {
      totalOrders: orders.length,
      totalRevenue,
      totalUsers: users.length,
      totalProducts: products.length,
      totalSellers: sellers.length,
      activeOrders: activeOrders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: completedOrders.length
    };
  }, [orders, products, users]);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.created.startsWith(date));
      return {
        name: new Date(date).toLocaleDateString('de-DE', { weekday: 'short' }),
        revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orders: dayOrders.length
      };
    });
  }, [orders]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.expand?.buyer_id?.name || '').toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const sellers = users.filter(u => u.is_seller);
  const filteredSellers = sellers.filter(s =>
    (s.seller_username || s.name || '').toLowerCase().includes(sellerSearch.toLowerCase())
  );

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Möchtest du dieses Produkt wirklich löschen?')) return;
    try {
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch(`/admin/products/${id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Produkt erfolgreich gelöscht');
      fetchTableProducts();
      fetchData(true);
    } catch (error) {
      toast.error('Fehler beim Löschen des Produkts');
    }
  };

  const handleEditProduct = async (id) => {
    try {
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch(`/admin/products/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setCurrentProduct(data);
      setEditModalOpen(true);
    } catch (error) {
      toast.error('Fehler beim Laden der Produktdetails');
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch(`/admin/products/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setCurrentProduct(data);
      setViewModalOpen(true);
    } catch (error) {
      toast.error('Fehler beim Laden der Produktdetails');
    }
  };

  const handleUpdateStock = async (id, currentStock) => {
    const qtyStr = window.prompt('Neue Lagermenge eingeben:', currentStock || 0);
    if (qtyStr === null) return;
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity)) { toast.error('Ungültige Menge'); return; }
    try {
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch(`/admin/products/${id}/stock`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      if (!res.ok) throw new Error('Stock update failed');
      toast.success('Lagerbestand aktualisiert');
      fetchTableProducts();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Lagerbestands');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch(`/admin/products/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status update failed');
      toast.success(`Status geändert zu ${newStatus}`);
      fetchTableProducts();
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const handleBulkSelect = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === tableProducts.length && tableProducts.length > 0) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(tableProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedProducts.length} Produkte wirklich löschen?`)) return;
    try {
      const token = pb.authStore.token;
      await Promise.all(selectedProducts.map(id =>
        apiServerClient.fetch(`/admin/products/${id}`, { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ));
      toast.success(`${selectedProducts.length} Produkte gelöscht`);
      setSelectedProducts([]);
      fetchTableProducts();
      fetchData(true);
    } catch (error) {
      toast.error('Fehler beim Löschen einiger Produkte');
    }
  };

  const handleSettingsChange = (field, value) => {
    setSettingsForm(prev => ({
      ...prev,
      [field]: value === '' ? '' : Number(value),
    }));
  };

  const handleSaveSettings = async () => {
    try {
      const token = pb.authStore.token;
      const res = await apiServerClient.fetch('/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settingsForm),
      });

      if (!res.ok) throw new Error('Settings update failed');

      const data = await res.json();
      setSettings(data);
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern der Einstellungen');
    }
  };

  if (loading && !orders.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[hsl(var(--muted-bg))] min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Lade Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Control Center</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                Übersicht und Verwaltung der gesamten Plattform
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Live (Letztes Update: {lastRefresh.toLocaleTimeString()})
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => fetchData()} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Manuell aktualisieren
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full space-y-6">
            <div className="overflow-x-auto pb-2">
              <TabsList className="bg-background border shadow-sm inline-flex w-max min-w-full sm:min-w-0">
                <TabsTrigger value="overview" className="gap-2"><BarChart3 className="w-4 h-4" /> Übersicht</TabsTrigger>
                <TabsTrigger value="orders" className="gap-2"><ShoppingCart className="w-4 h-4" /> Bestellungen</TabsTrigger>
                <TabsTrigger value="products" className="gap-2"><Package className="w-4 h-4" /> Produkte</TabsTrigger>
                <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Benutzer</TabsTrigger>
                <TabsTrigger value="sellers" className="gap-2"><Store className="w-4 h-4" /> Verkäufer</TabsTrigger>
                <TabsTrigger value="returns" className="gap-2"><RotateCcw className="w-4 h-4" /> Retouren</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" /> Analytics</TabsTrigger>
                <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> Einstellungen</TabsTrigger>
              </TabsList>
            </div>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary text-primary-foreground border-none shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-primary-foreground/80">Gesamtumsatz</CardTitle>
                    <DollarSign className="w-4 h-4 text-primary-foreground/80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Bestellungen</CardTitle>
                    <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalOrders}</div>
                    <div className="flex gap-2 mt-2 text-xs">
                      <span className="text-blue-600">{stats.activeOrders} aktiv</span>
                      <span className="text-yellow-600">{stats.pendingOrders} ausstehend</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Benutzer</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.totalSellers} davon Verkäufer</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Produkte</CardTitle>
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalProducts}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Umsatz der letzten 7 Tage</CardTitle></CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `€${val}`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="revenue" stroke="#0000FF" strokeWidth={3} dot={{ r: 4, fill: '#0000FF' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Neueste Bestellungen</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <ShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{order.order_number || order.id.substring(0, 8)}</p>
                              <p className="text-xs text-muted-foreground">{order.expand?.buyer_id?.name || 'Kunde'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">€{order.total_amount?.toFixed(2)}</p>
                            <Badge variant="outline" className="text-[10px] mt-1">{order.status || 'Neu'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ORDERS */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Bestellverwaltung</CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Suchen..." className="pl-9" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
                      </div>
                      <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Status</SelectItem>
                          <SelectItem value="pending">Ausstehend</SelectItem>
                          <SelectItem value="paid">Bezahlt</SelectItem>
                          <SelectItem value="shipped">Versendet</SelectItem>
                          <SelectItem value="delivered">Zugestellt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"><Checkbox /></TableHead>
                          <TableHead>Bestell-ID</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map(order => (
                          <TableRow key={order.id}>
                            <TableCell><Checkbox /></TableCell>
                            <TableCell className="font-medium">{order.order_number || order.id.substring(0, 8)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{order.expand?.buyer_id?.name || 'Unbekannt'}</span>
                                <span className="text-xs text-muted-foreground">{order.expand?.buyer_id?.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(order.created).toLocaleDateString('de-DE')}</TableCell>
                            <TableCell>
                              <Badge variant={order.status === 'delivered' ? 'default' : 'outline'}>{order.status || 'pending'}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">€{order.total_amount?.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredOrders.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Bestellungen gefunden</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PRODUCTS */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Produktverwaltung</CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      {selectedProducts.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                          {selectedProducts.length} Löschen
                        </Button>
                      )}
                      <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Typ" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Typen</SelectItem>
                          <SelectItem value="Article">Artikel</SelectItem>
                          <SelectItem value="Set">Set</SelectItem>
                          <SelectItem value="Consumable">Verbrauchsmaterial</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Kategorie" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Kategorien</SelectItem>
                          <SelectItem value="Paro">Paro</SelectItem>
                          <SelectItem value="Kons">Kons</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="KFO">KFO</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Produkt suchen..." className="pl-9" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox checked={selectedProducts.length === tableProducts.length && tableProducts.length > 0} onCheckedChange={handleSelectAllProducts} />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Preis</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Kategorie</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[180px] text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isProductsLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                              <TableCell><Skeleton className="h-8 w-[140px] ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : tableProducts.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Produkte gefunden</TableCell></TableRow>
                        ) : (
                          tableProducts.map(product => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <Checkbox checked={selectedProducts.includes(product.id)} onCheckedChange={() => handleBulkSelect(product.id)} />
                              </TableCell>
                              <TableCell className="font-medium max-w-[200px] truncate">{product.name}</TableCell>
                              <TableCell>€{product.price?.toFixed(2)}</TableCell>
                              <TableCell><Badge variant="secondary">{product.product_type || 'Article'}</Badge></TableCell>
                              <TableCell>{product.fachbereich || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch checked={product.status === 'active'} onCheckedChange={() => handleToggleStatus(product.id, product.status)} />
                                  <span className="text-xs text-muted-foreground">{product.status === 'active' ? 'Aktiv' : 'Inaktiv'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(product.id)}><Eye className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStock(product.id, product.stock_quantity)}><Package className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProduct(product.id)}><Edit className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* USERS */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Benutzerverwaltung</CardTitle>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Name oder E-Mail..." className="pl-9" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"><Checkbox /></TableHead>
                          <TableHead>Benutzer</TableHead>
                          <TableHead>Rolle</TableHead>
                          <TableHead>Registriert am</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(user => (
                          <TableRow key={user.id}>
                            <TableCell><Checkbox /></TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name || 'Kein Name'}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {user.is_admin && <Badge className="bg-purple-500">Admin</Badge>}
                                {user.is_seller && <Badge className="bg-blue-500">Verkäufer</Badge>}
                                {!user.is_admin && !user.is_seller && <Badge variant="secondary">Käufer</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>{new Date(user.created).toLocaleDateString('de-DE')}</TableCell>
                            <TableCell><Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Aktiv</Badge></TableCell>
                            <TableCell><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SELLERS */}
            <TabsContent value="sellers" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Verkäufer & Shops</CardTitle>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Verkäufer suchen..." className="pl-9" value={sellerSearch} onChange={(e) => setSellerSearch(e.target.value)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop / Verkäufer</TableHead>
                          <TableHead>E-Mail</TableHead>
                          <TableHead>Produkte</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSellers.map(seller => {
                          const sellerProducts = products.filter(p => p.seller_id === seller.id).length;
                          return (
                            <TableRow key={seller.id}>
                              <TableCell className="font-medium">{seller.seller_username || seller.name || 'Unbenannt'}</TableCell>
                              <TableCell>{seller.email}</TableCell>
                              <TableCell>{sellerProducts}</TableCell>
                              <TableCell><Badge className="bg-green-500">Verifiziert</Badge></TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="gap-1"><Eye className="w-4 h-4" /> Profil</Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredSellers.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Keine Verkäufer gefunden</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* RETURNS */}
            <TabsContent value="returns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Retouren & Rückerstattungen</CardTitle>
                  <CardDescription>Verwalte Rücksendeanfragen und Erstattungen</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Retouren-ID</TableHead>
                          <TableHead>Bestellung</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Grund</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returns.map(ret => (
                          <TableRow key={ret.id}>
                            <TableCell className="font-medium">{ret.id.substring(0, 8)}</TableCell>
                            <TableCell>{ret.expand?.order_id?.order_number || ret.order_id}</TableCell>
                            <TableCell>{ret.expand?.buyer_id?.name || 'Kunde'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{ret.reason}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={ret.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}>
                                {ret.status || 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">Akzeptieren</Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Ablehnen</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {returns.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Keine aktiven Retouren vorhanden</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ANALYTICS */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Bestellvolumen (7 Tage)</CardTitle></CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="orders" fill="#0000FF" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Top Verkäufer</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sellers.slice(0, 5).map((seller, i) => {
                        const sellerRevenue = orders.filter(o => o.seller_id === seller.id).reduce((sum, o) => sum + (o.total_amount || 0), 0);
                        const sellerProductCount = products.filter(p => p.seller_id === seller.id).length;
                        return (
                          <div key={seller.id} className="flex items-center justify-between p-3 border-b last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-xs">{i + 1}</div>
                              <div>
                                <p className="font-medium text-sm">{seller.seller_username || seller.name}</p>
                                <p className="text-xs text-muted-foreground">{sellerProductCount} Produkte</p>
                              </div>
                            </div>
                            <div className="font-bold text-sm">€{sellerRevenue.toFixed(2)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SETTINGS */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>Plattform Einstellungen</CardTitle>
                  <CardDescription>Globale Gebühren und Konfigurationen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Käufer-Servicegebühr (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settingsForm.service_fee}
                        onChange={(e) => handleSettingsChange('service_fee', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Standard Versandkosten (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settingsForm.shipping_fee}
                        onChange={(e) => handleSettingsChange('shipping_fee', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Verkäufergebühr (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settingsForm.transaction_fee_percentage}
                        onChange={(e) => handleSettingsChange('transaction_fee_percentage', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Verifizierungsgebühr (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settingsForm.verification_fee}
                        onChange={(e) => handleSettingsChange('verification_fee', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                    Einstellungen speichern
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Produkt bearbeiten</DialogTitle></DialogHeader>
          {currentProduct && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const token = pb.authStore.token;
                const res = await apiServerClient.fetch(`/admin/products/${currentProduct.id}`, {
                  method: 'PUT',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(currentProduct)
                });
                if (!res.ok) throw new Error('Update failed');
                toast.success('Produkt aktualisiert');
                setEditModalOpen(false);
                fetchTableProducts();
                fetchData(true);
              } catch (error) {
                toast.error('Fehler beim Speichern');
              }
            }} className="space-y-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={currentProduct.name || ''} onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Beschreibung</Label>
                <Textarea value={currentProduct.description || ''} onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Preis (€)</Label>
                  <Input type="number" step="0.01" value={currentProduct.price || 0} onChange={e => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} required />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={currentProduct.status || ''} onValueChange={v => setCurrentProduct({ ...currentProduct, status: v })}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="pending_verification">In Prüfung</SelectItem>
                      <SelectItem value="sold">Verkauft</SelectItem>
                      <SelectItem value="rejected">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Abbrechen</Button>
                <Button type="submit">Speichern</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Produktdetails</DialogTitle></DialogHeader>
          {currentProduct && (
            <div className="space-y-4">
              <div><h4 className="text-sm font-medium text-muted-foreground">Name</h4><p>{currentProduct.name}</p></div>
              <div><h4 className="text-sm font-medium text-muted-foreground">Beschreibung</h4><p className="text-sm">{currentProduct.description || '-'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><h4 className="text-sm font-medium text-muted-foreground">Preis</h4><p>€{currentProduct.price?.toFixed(2)}</p></div>
                <div><h4 className="text-sm font-medium text-muted-foreground">Zustand</h4><p>{currentProduct.condition || '-'}</p></div>
                <div><h4 className="text-sm font-medium text-muted-foreground">Fachbereich</h4><p>{currentProduct.fachbereich || '-'}</p></div>
                <div><h4 className="text-sm font-medium text-muted-foreground">Status</h4><Badge variant="outline">{currentProduct.status}</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDashboardPage;
