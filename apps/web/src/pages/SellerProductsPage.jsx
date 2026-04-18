import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Edit,
  Eye,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const SUBJECTS = [
  { id: 'Paro', key: 'marketplace.subject_paro' },
  { id: 'Kons', key: 'marketplace.subject_kons' },
  { id: 'Pro', key: 'marketplace.subject_pro' },
  { id: 'KFO', key: 'marketplace.subject_kfo' },
];

const PRODUCT_TYPES = [
  { value: 'Article', key: 'marketplace.type_article' },
  { value: 'Set', key: 'marketplace.type_set' },
  { value: 'Consumable', key: 'marketplace.type_consumable' },
];

const CONDITIONS = [
  { value: 'Neu', key: 'marketplace.condition_new' },
  { value: 'Wie neu', key: 'marketplace.condition_like_new' },
  { value: 'Gut', key: 'marketplace.condition_good' },
  { value: 'Befriedigend', key: 'marketplace.condition_satisfactory' },
];

const SellerProductsPage = () => {
  const { currentUser } = useAuth();
  const { t, language } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const result = await pb.collection('products').getList(1, 100, {
        filter: `seller_id="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false,
      });
      setProducts(result.items);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(t('seller.products_load_error'));
    } finally {
      setLoading(false);
    }
  }, [currentUser, t]);

  useEffect(() => {
    fetchProducts();

    if (currentUser) {
      pb.collection('products').subscribe('*', (event) => {
        if (event.record?.seller_id === currentUser.id) {
          fetchProducts();
        }
      });
    }

    return () => {
      pb.collection('products').unsubscribe('*');
    };
  }, [fetchProducts, currentUser]);

  const productStats = useMemo(() => {
    return products.reduce(
      (stats, product) => {
        stats.total += 1;
        if (product.status === 'active' || product.status === 'verified') stats.active += 1;
        if (product.status === 'pending_verification' || product.status === 'draft') stats.pending += 1;
        if (product.status === 'sold') stats.sold += 1;
        return stats;
      },
      { total: 0, active: 0, pending: 0, sold: 0 }
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const searchable = [
        product.name,
        product.description,
        product.product_type,
        product.condition,
        Array.isArray(product.fachbereich) ? product.fachbereich.join(' ') : product.fachbereich,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [products, searchTerm, statusFilter]);

  const formatPrice = (price) =>
    new Intl.NumberFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(price) || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat(language === 'DE' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const translateOption = (options, value, fallback = '-') => {
    const option = options.find((item) => item.value === value || item.id === value);
    return option ? t(option.key) : fallback;
  };

  const getSubjectLabels = (value) => {
    const subjects = Array.isArray(value) ? value : value ? [value] : [];
    if (subjects.length === 0) return '-';
    return subjects.map((subject) => translateOption(SUBJECTS, subject, subject)).join(', ');
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      price: String(product.price ?? ''),
      product_type: product.product_type || 'Article',
      condition: product.condition || 'Gut',
      fachbereich: Array.isArray(product.fachbereich) ? product.fachbereich : product.fachbereich ? [product.fachbereich] : [],
      description: product.description || '',
    });
  };

  const closeEditDialog = () => {
    if (savingEdit) return;
    setEditingProduct(null);
    setEditForm(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubjectToggle = (subjectId) => {
    setEditForm((currentForm) => {
      const currentSubjects = currentForm.fachbereich;
      const nextSubjects = currentSubjects.includes(subjectId)
        ? currentSubjects.filter((subject) => subject !== subjectId)
        : [...currentSubjects, subjectId];

      return { ...currentForm, fachbereich: nextSubjects };
    });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingProduct || !editForm) return;

    const price = Number(editForm.price);

    if (!editForm.name.trim()) {
      toast.error(t('seller.name_required'));
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      toast.error(t('seller.price_invalid'));
      return;
    }

    setSavingEdit(true);
    try {
      const updatedProduct = await pb.collection('products').update(
        editingProduct.id,
        {
          name: editForm.name.trim(),
          price,
          product_type: editForm.product_type,
          condition: editForm.condition,
          fachbereich: editForm.fachbereich,
          description: editForm.description.trim(),
        },
        { $autoCancel: false }
      );

      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updatedProduct.id ? updatedProduct : product))
      );
      toast.success(t('seller.update_success'));
      closeEditDialog();
    } catch (err) {
      console.error('Error updating product:', err);
      toast.error(t('seller.update_error'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('seller.delete_confirm'))) return;

    try {
      await pb.collection('products').delete(id, { $autoCancel: false });
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
      toast.success(t('seller.delete_success'));
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error(t('seller.delete_error'));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'verified':
        return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{t('seller.status_active')}</Badge>;
      case 'pending_verification':
      case 'draft':
        return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">{t('seller.status_pending')}</Badge>;
      case 'sold':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600">{t('seller.status_sold')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('seller.status_rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status || '-'}</Badge>;
    }
  };

  const ProductImage = ({ product, className = 'h-14 w-14' }) => (
    <div className={`${className} shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-100`}>
      {product.image ? (
        <img src={pb.files.getUrl(product, product.image)} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {t('seller.no_image')}
        </div>
      )}
    </div>
  );

  const ProductActions = ({ product }) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        asChild
        variant="ghost"
        size="icon"
        title={t('seller.view')}
        aria-label={`${t('seller.view')}: ${product.name}`}
        className="rounded-full text-blue-700 hover:bg-blue-50 hover:text-blue-800"
      >
        <Link to={`/product/${product.id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t('seller.edit')}
        aria-label={`${t('seller.edit')}: ${product.name}`}
        className="rounded-full text-slate-700 hover:bg-slate-100"
        onClick={() => openEditDialog(product)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t('seller.delete')}
        aria-label={`${t('seller.delete')}: ${product.name}`}
        onClick={() => handleDelete(product.id)}
        className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderLoading = () => (
    <div className="space-y-3 p-5 md:p-6">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="hidden h-9 w-28 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{t('seller.my_items')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[linear-gradient(180deg,#f6f1e8_0%,#fbfaf7_34%,#ffffff_100%)] py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mb-8 overflow-hidden rounded-[32px] border border-black/5 bg-slate-950 p-6 text-white shadow-sm md:p-8">
            <div className="absolute inset-0 opacity-80">
              <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#0000FF]/60 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                  <Package className="h-3.5 w-3.5" />
                  {t('seller.inventory')}
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{t('seller.my_items')}</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 md:text-base">
                  {t('seller.page_subtitle')}
                </p>
              </div>

              <Button asChild size="lg" className="h-12 rounded-full bg-white px-5 text-slate-950 shadow-none hover:bg-blue-50">
                <Link to="/seller/new-product">
                  <Plus className="h-4 w-4" />
                  {t('seller.new_product')}
                </Link>
              </Button>
            </div>
          </div>

          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t('seller.total_listings'), value: productStats.total, icon: Package, className: 'bg-slate-950 text-white' },
              { label: t('seller.active_listings'), value: productStats.active, icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800' },
              { label: t('seller.pending_listings'), value: productStats.pending, icon: RefreshCw, className: 'bg-amber-50 text-amber-800' },
              { label: t('seller.sold_listings'), value: productStats.sold, icon: Tag, className: 'bg-blue-50 text-blue-800' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.className}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{t('seller.inventory_table')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('seller.products_summary', { count: filteredProducts.length })}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                <div className="relative sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t('seller.search_placeholder')}
                    className="h-11 rounded-full bg-slate-50 pl-9 shadow-none"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 rounded-full bg-slate-50 shadow-none sm:w-52">
                    <Filter className="mr-2 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder={t('seller.status_filter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('seller.filter_all')}</SelectItem>
                    <SelectItem value="active">{t('seller.status_active')}</SelectItem>
                    <SelectItem value="pending_verification">{t('seller.status_pending')}</SelectItem>
                    <SelectItem value="sold">{t('seller.status_sold')}</SelectItem>
                    <SelectItem value="rejected">{t('seller.status_rejected')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              renderLoading()
            ) : error ? (
              <div className="flex flex-col items-center p-12 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <p className="mb-4 text-red-600">{error}</p>
                <Button onClick={fetchProducts} variant="outline" className="gap-2 rounded-full">
                  <RefreshCw className="h-4 w-4" />
                  {t('seller.retry')}
                </Button>
              </div>
            ) : products.length > 0 && filteredProducts.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">{t('seller.product_name')}</TableHead>
                        <TableHead>{t('seller.price')}</TableHead>
                        <TableHead>{t('seller.details')}</TableHead>
                        <TableHead>{t('seller.status')}</TableHead>
                        <TableHead>{t('seller.updated')}</TableHead>
                        <TableHead className="pr-6 text-right">{t('seller.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-blue-50/30">
                          <TableCell className="pl-6">
                            <div className="flex min-w-[260px] items-center gap-4">
                              <ProductImage product={product} />
                              <div>
                                <p className="font-semibold text-slate-950">{product.name}</p>
                                <p className="mt-1 line-clamp-1 max-w-[300px] text-xs text-slate-500">
                                  {product.description || t('product.no_description')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-slate-950">{formatPrice(product.price)}</p>
                              <p className="mt-1 text-xs text-slate-500">{translateOption(CONDITIONS, product.condition, product.condition)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-slate-700">{translateOption(PRODUCT_TYPES, product.product_type, product.product_type)}</p>
                              <p className="max-w-[220px] truncate text-xs text-slate-500">{getSubjectLabels(product.fachbereich)}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(product.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <CalendarDays className="h-4 w-4" />
                              {formatDate(product.updated || product.created)}
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <ProductActions product={product} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 p-4 md:hidden">
                  {filteredProducts.map((product) => (
                    <article key={product.id} className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <ProductImage product={product} className="h-20 w-20" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 font-semibold text-slate-950">{product.name}</h3>
                            {getStatusBadge(product.status)}
                          </div>
                          <p className="font-semibold text-slate-950">{formatPrice(product.price)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {translateOption(PRODUCT_TYPES, product.product_type, product.product_type)} / {translateOption(CONDITIONS, product.condition, product.condition)}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{getSubjectLabels(product.fachbereich)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500">{formatDate(product.updated || product.created)}</span>
                        <ProductActions product={product} />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0000FF]">
                  <Package className="h-7 w-7" />
                </div>
                <p className="mb-4 text-slate-600">
                  {products.length === 0 ? t('seller.empty_items') : t('seller.empty_filtered')}
                </p>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/seller/new-product">{t('seller.sell_first')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={Boolean(editingProduct)} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('seller.edit_dialog_title')}</DialogTitle>
              <DialogDescription>{t('seller.edit_dialog_body')}</DialogDescription>
            </DialogHeader>

            {editForm && (
              <form onSubmit={handleEditSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-name">{t('seller.product_name')}</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(event) => handleEditFieldChange('name', event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-price">{t('seller.price')}</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(event) => handleEditFieldChange('price', event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('seller.type')}</Label>
                    <Select value={editForm.product_type} onValueChange={(value) => handleEditFieldChange('product_type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(type.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('seller.condition')}</Label>
                    <Select value={editForm.condition} onValueChange={(value) => handleEditFieldChange('condition', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {t(condition.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('seller.subjects')}</Label>
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-4">
                      {SUBJECTS.map((subject) => (
                        <label key={subject.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <Checkbox
                            checked={editForm.fachbereich.includes(subject.id)}
                            onCheckedChange={() => handleSubjectToggle(subject.id)}
                          />
                          {t(subject.key)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-description">{t('seller.description')}</Label>
                    <Textarea
                      id="edit-description"
                      rows={5}
                      value={editForm.description}
                      onChange={(event) => handleEditFieldChange('description', event.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeEditDialog} disabled={savingEdit}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={savingEdit} className="bg-[#0000FF] text-white hover:bg-[#0000CC]">
                    {savingEdit ? t('seller.saving') : t('seller.save_changes')}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
};

export default SellerProductsPage;
