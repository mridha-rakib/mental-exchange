import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CircleUserRound,
  GraduationCap,
  IdCard,
  Mail,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import ShippingInfoSection from '@/components/ShippingInfoSection.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const getInitials = (name = '', email = '') => {
  const source = name || email || '?';
  const parts = source.trim().split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const primaryActionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0000FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0000CC] disabled:pointer-events-none disabled:opacity-60';
const secondaryActionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#151515] transition-colors hover:border-[#0000FF]/35 hover:bg-[#f3f3ff] disabled:pointer-events-none disabled:opacity-60';
const inverseActionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0000FF]';

const ProfilePage = () => {
  const { currentUser, isSeller, refreshUser } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isTogglingSeller, setIsTogglingSeller] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountData, setAccountData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    university: currentUser?.university || ''
  });

  const dateLocale = language === 'EN' ? 'en-US' : 'de-DE';

  useEffect(() => {
    setAccountData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      university: currentUser?.university || ''
    });
  }, [currentUser]);

  useEffect(() => {
    const loadOrders = async () => {
      if (!currentUser?.id) return;

      setIsLoadingOrders(true);
      try {
        const result = await pb.collection('orders').getFullList({
          filter: `buyer_id = "${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        setOrders(result);
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    loadOrders();
  }, [currentUser?.id]);

  const profileStats = useMemo(() => {
    const activeOrders = orders.filter(order => ['pending', 'processing', 'shipped'].includes(order.status)).length;
    const completedOrders = orders.filter(order => order.status === 'delivered').length;

    return [
      {
        label: t('profile.total_orders'),
        value: orders.length,
        Icon: ShoppingBag
      },
      {
        label: t('profile.active_orders'),
        value: activeOrders,
        Icon: Truck
      },
      {
        label: t('profile.completed_orders'),
        value: completedOrders,
        Icon: PackageCheck
      }
    ];
  }, [orders, t]);

  const accountItems = [
    {
      label: t('shipping.name'),
      value: currentUser?.name || t('profile.not_provided'),
      Icon: CircleUserRound
    },
    {
      label: 'E-Mail',
      value: currentUser?.email || t('profile.not_provided'),
      Icon: Mail
    },
    {
      label: t('shipping.phone'),
      value: currentUser?.phone || t('profile.not_provided'),
      Icon: Phone
    },
    {
      label: t('auth.university'),
      value: currentUser?.university || t('profile.not_provided'),
      Icon: GraduationCap
    },
    {
      label: t('profile.user_id'),
      value: currentUser?.user_id || currentUser?.id || t('profile.not_provided'),
      Icon: IdCard,
      mono: true
    }
  ];

  const flowSteps = [
    t('profile.flow_account'),
    t('profile.flow_seller'),
    t('profile.flow_orders')
  ];

  const formatCurrency = (amount) => {
    const value = Number(amount || 0);
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return t('profile.not_provided');

    return new Date(date).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getOrderStatusLabel = (status) => {
    const key = `orders.status_${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const handleSellerToggle = async (checked) => {
    if (checked) {
      if (!isSeller) {
        navigate('/seller-info');
      }
      return;
    }

    setIsTogglingSeller(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        is_seller: false,
        seller_username: ''
      }, { $autoCancel: false });

      await refreshUser();
      toast.success(t('profile.seller_disabled'));
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error(t('profile.seller_disable_error'));
    } finally {
      setIsTogglingSeller(false);
    }
  };

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountData(prev => ({ ...prev, [name]: value }));
  };

  const resetAccountForm = () => {
    setIsEditingAccount(false);
    setAccountData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      university: currentUser?.university || ''
    });
  };

  const handleSaveAccount = async () => {
    if (!accountData.email) {
      toast.error(t('profile.email_required'));
      return;
    }

    setAccountLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, accountData, { $autoCancel: false });
      await refreshUser();
      toast.success(t('profile.account_save_success'));
      setIsEditingAccount(false);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(t('profile.account_save_error'));
    } finally {
      setAccountLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('profile.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 overflow-hidden bg-[#f8f4ec] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.08)_1px,transparent_0)] bg-[size:26px_26px] py-8 md:py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="mb-5 overflow-hidden rounded-[32px] border border-black/12 bg-white">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-b border-black/10 p-6 md:p-8 lg:border-b-0 lg:border-r lg:p-10">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0000FF]">
                  {t('profile.account_eyebrow')}
                </p>
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] border border-[#0000FF] bg-[#0000FF] text-3xl font-bold text-white">
                    {getInitials(currentUser?.name, currentUser?.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0000FF]/20 bg-[#f1f1ff] px-3 py-1 text-xs font-semibold text-[#0000FF]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('profile.student_account')}
                      </span>
                      {isSeller && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/20 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {t('profile.seller_verified')}
                        </span>
                      )}
                    </div>
                    <h1 className="truncate text-4xl font-bold leading-tight text-[#111111] md:text-5xl">
                      {currentUser?.name || t('profile.title')}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f5f5f] md:text-base">
                      {t('profile.subtitle')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between bg-[#101010] p-6 text-white md:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                    {t('profile.seller_status')}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-4 rounded-[24px] border border-white/14 bg-white/[0.06] p-4">
                    <div>
                      <Label htmlFor="seller-mode" className="cursor-pointer text-base font-semibold">
                        {t('profile.seller_mode')}
                      </Label>
                      <p className="mt-1 text-sm text-white/62">
                        {isSeller ? t('profile.seller_active_hint') : t('profile.seller_inactive_hint')}
                      </p>
                    </div>
                    <Switch
                      id="seller-mode"
                      checked={isSeller}
                      onCheckedChange={handleSellerToggle}
                      disabled={isTogglingSeller}
                      aria-label={t('profile.seller_mode')}
                    />
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {profileStats.map(({ label, value, Icon }) => (
                    <div key={label} className="rounded-[22px] border border-white/14 bg-white/[0.05] p-4">
                      <Icon className="mb-3 h-4 w-4 text-white/62" />
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="mt-1 text-xs leading-4 text-white/55">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-5 rounded-[28px] border border-black/12 bg-[#fffaf0] p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5a00]">
                {t('profile.flow_title')}
              </p>
              <div className="grid flex-1 gap-2 md:grid-cols-3">
                {flowSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0000FF] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-[#171717]">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[28px] border border-black/12 bg-white">
                <header className="flex flex-col gap-4 border-b border-black/10 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0000FF]">
                      {t('profile.details_eyebrow')}
                    </p>
                    <h2 className="text-2xl font-semibold">{t('profile.account_info')}</h2>
                  </div>
                  {!isEditingAccount && (
                    <button type="button" className={secondaryActionClass} onClick={() => setIsEditingAccount(true)}>
                      <Pencil className="h-4 w-4" />
                      {t('seller.edit')}
                    </button>
                  )}
                </header>

                <div className="p-6">
                  {isEditingAccount ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('shipping.name')}</Label>
                        <Input id="name" name="name" value={accountData.name} onChange={handleAccountChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-Mail *</Label>
                        <Input id="email" name="email" type="email" value={accountData.email} onChange={handleAccountChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('shipping.phone')}</Label>
                        <Input id="phone" name="phone" value={accountData.phone} onChange={handleAccountChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="university">{t('auth.university')}</Label>
                        <Input id="university" name="university" value={accountData.university} onChange={handleAccountChange} />
                      </div>
                      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                        <button type="button" onClick={handleSaveAccount} disabled={accountLoading} className={primaryActionClass}>
                          <Save className="h-4 w-4" />
                          {accountLoading ? t('shipping.saving') : t('shipping.save')}
                        </button>
                        <button type="button" onClick={resetAccountForm} disabled={accountLoading} className={secondaryActionClass}>
                          <X className="h-4 w-4" />
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {accountItems.map(({ label, value, Icon, mono }) => (
                        <div key={label} className="flex gap-4 rounded-[22px] border border-black/10 bg-[#fbfbf8] p-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#0000FF]/15 bg-[#f1f1ff] text-[#0000FF]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#777777]">{label}</p>
                            <p className={`mt-1 break-words text-sm font-semibold text-[#151515] ${mono ? 'font-mono' : ''}`}>
                              {value}
                            </p>
                          </div>
                        </div>
                      ))}

                      {isSeller && (
                        <div className="flex gap-4 rounded-[22px] border border-[#0000FF]/18 bg-[#f4f4ff] p-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#0000FF]/15 bg-white text-[#0000FF]">
                            <Store className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#777777]">{t('seller.username')}</p>
                            <p className="mt-1 break-words text-sm font-semibold text-[#0000FF]">
                              {currentUser?.seller_username || t('profile.not_provided')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {orders.length > 0 && (
                <div className="[&>section]:overflow-hidden">
                  <ShippingInfoSection />
                </div>
              )}

              {isSeller && (
                <section className="overflow-hidden rounded-[28px] border border-[#0000FF] bg-[#0000FF] text-white">
                  <div className="p-6">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white text-[#0000FF]">
                      <Store className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-semibold">{t('seller.my_items')}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      {t('profile.seller_items_body')}
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Link to="/seller/new-product" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0000FF] transition-colors hover:bg-[#ededff]">
                        <Plus className="h-4 w-4" />
                        {t('seller.sell_first')}
                      </Link>
                      <Link to="/seller-products" className={inverseActionClass}>
                        {t('profile.manage_items')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <section className="space-y-5">
              <section className="overflow-hidden rounded-[28px] border border-black/12 bg-white">
                <header className="flex flex-col gap-4 border-b border-black/10 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0000FF]">
                      {t('profile.activity_eyebrow')}
                    </p>
                    <h2 className="text-2xl font-semibold">{t('orders.title')}</h2>
                  </div>
                  <Link to="/my-orders" className={secondaryActionClass}>
                    {t('orders.view')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </header>

                <div className="p-6">
                  {isLoadingOrders ? (
                    <div className="grid gap-3">
                      {[0, 1, 2].map(item => (
                        <div key={item} className="h-24 animate-pulse rounded-[22px] border border-black/8 bg-black/[0.03]" />
                      ))}
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.slice(0, 4).map(order => (
                        <div key={order.id} className="rounded-[22px] border border-black/10 bg-[#fbfbf8] p-4 transition-colors hover:border-[#0000FF]/35 hover:bg-white">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#151515]">
                                {t('orders.id')} #{order.order_number || order.id}
                              </p>
                              <p className="mt-1 text-sm text-[#707070]">{formatDate(order.created)}</p>
                            </div>
                            <span className="w-fit rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#151515]">
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-col gap-2 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-lg font-bold text-[#0000FF]">{formatCurrency(order.total_amount)}</p>
                            {order.dhl_tracking_number ? (
                              <p className="text-sm text-[#707070]">
                                {t('orders.tracking_short')}: {order.dhl_tracking_number}
                              </p>
                            ) : (
                              <p className="text-sm text-[#707070]">{t('order_details.tracking_pending')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[26px] border border-dashed border-black/18 bg-[#faf7ef] px-6 py-10 text-center">
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#0000FF]/15 bg-white text-[#0000FF]">
                        <ShoppingBag className="h-7 w-7" />
                      </div>
                      <h2 className="text-2xl font-semibold text-[#151515]">{t('orders.empty')}</h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-[#686868]">
                        {t('profile.no_orders_body')}
                      </p>
                      <Link to="/shop" className={`mt-6 ${primaryActionClass}`}>
                        {t('orders.shop_now')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-black/12 bg-[#151515] text-white">
                <div className="grid gap-5 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/18 bg-white/[0.06] text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{t('profile.safe_account_title')}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/68">{t('profile.safe_account_body')}</p>
                  </div>
                  <Link to="/hilfe" className={inverseActionClass}>{t('profile.get_help')}</Link>
                </div>
              </section>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProfilePage;
