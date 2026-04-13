import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const SellerProductsPage = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const result = await pb.collection('products').getList(1, 100, {
        filter: `seller_id="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setProducts(result.items);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(t('seller.products_load_error'));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProducts();

    if (currentUser) {
      pb.collection('products').subscribe('*', function (e) {
        if (e.record.seller_id === currentUser.id) {
          fetchProducts();
        }
      });
    }

    return () => {
      pb.collection('products').unsubscribe('*');
    };
  }, [fetchProducts, currentUser]);

  const handleDelete = async (id) => {
    if (!window.confirm(t('seller.delete_confirm'))) return;
    
    try {
      await pb.collection('products').delete(id, { $autoCancel: false });
      toast.success(t('seller.delete_success'));
      // No need to call fetchProducts manually, realtime subscription handles it
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error(t('seller.delete_error'));
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <Badge className="bg-green-500">{t('seller.status_active')}</Badge>;
      case 'pending_verification': return <Badge variant="outline" className="text-orange-500 border-orange-500">{t('seller.status_pending')}</Badge>;
      case 'sold': return <Badge variant="secondary">{t('seller.status_sold')}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('seller.my_items')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold font-['Playfair_Display']">{t('seller.my_items')}</h1>
            <Link to="/seller/new-product">
              <Button className="bg-[#0000FF] hover:bg-[#0000CC] text-white flex items-center gap-2">
                <Plus size={18} /> {t('seller.new_product')}
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-[var(--radius-md)] shadow-sm border border-[hsl(var(--border))] overflow-hidden">
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
                <Button onClick={fetchProducts} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> {t('seller.retry')}
                </Button>
              </div>
            ) : products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('seller.product_name')}</TableHead>
                    <TableHead>{t('seller.price')}</TableHead>
                    <TableHead>{t('seller.category')}</TableHead>
                    <TableHead>{t('seller.type')}</TableHead>
                    <TableHead>{t('seller.status')}</TableHead>
                    <TableHead className="text-right">{t('seller.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>€{product.price?.toFixed(2)}</TableCell>
                      <TableCell>{product.fachbereich?.join(', ') || '-'}</TableCell>
                      <TableCell>{product.product_type}</TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" title={t('seller.edit')}>
                            <Edit size={16} className="text-[hsl(var(--secondary-text))]" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleDelete(product.id)}
                            title={t('seller.delete')}
                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <p className="text-[hsl(var(--secondary-text))] mb-4">{t('seller.empty_items')}</p>
                <Link to="/seller/new-product">
                  <Button variant="outline">{t('seller.sell_first')}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default SellerProductsPage;
