import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { t } = useTranslation();
  
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔄 useEffect triggered in SuccessPage (Verify Payment)', { sessionId });
    
    if (!sessionId) {
      navigate('/');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await apiServerClient.fetch(`/checkout/session/${sessionId}`);
        
        if (!response.ok) {
          throw new Error(t('success.verify_error'));
        }

        const data = await response.json();
        setOrderDetails(data);
        
        // Clear cart on successful payment verification
        if (data.status === 'paid' || data.status === 'complete') {
          clearCart().catch(console.error);
        }
        
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate, clearCart, t]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[hsl(var(--secondary))]">{t('success.verifying')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4">{t('success.error_title')}</h1>
        <p className="text-[hsl(var(--secondary))] mb-8 max-w-md">
          {t('success.support_body', { error })}
        </p>
        <Button onClick={() => navigate('/contact')}>{t('success.contact_support')}</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('success.title')} - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted))] py-12 md:py-20">
        <div className="max-w-[600px] mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-[8px] p-8 md:p-12 shadow-card text-center">
            
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl font-bold mb-4">
              {t('success.thank_you')}
            </h1>
            
            <p className="text-[hsl(var(--secondary))] mb-8">
              {t('success.body', { email: orderDetails?.customerEmail || '' })}
            </p>

            <div className="bg-[hsl(var(--muted))] rounded-[8px] p-6 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Package className="text-[hsl(var(--primary))]" />
                <h2 className="font-semibold text-lg">{t('order_details.title')}</h2>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                  <span className="text-[hsl(var(--secondary))]">Status</span>
                  <span className="font-medium text-green-600">{t('success.paid')}</span>
                </div>
                {orderDetails?.amountTotal && (
                  <div className="flex justify-between pt-1">
                    <span className="text-[hsl(var(--secondary))]">{t('orders.total')}</span>
                    <span className="font-bold text-[hsl(var(--primary))]">
                      €{(orderDetails.amountTotal / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/my-orders" 
                className="inline-flex items-center justify-center px-6 py-3 border border-[hsl(var(--border))] rounded-[8px] font-medium hover:bg-[hsl(var(--muted))] transition-smooth"
              >
                {t('success.view_orders')}
              </Link>
              <Link 
                to="/marketplace" 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[hsl(var(--primary))] text-white rounded-[8px] font-medium hover:bg-[hsl(var(--primary-hover))] transition-smooth shadow-button"
              >
                {t('cart.continue')}
                <ArrowRight size={18} />
              </Link>
            </div>

          </div>
        </div>
      </main>
    </>
  );
};

export default SuccessPage;
