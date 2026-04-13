import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const SellerActivationFlow = () => {
  const { currentUser, refreshUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError(t('seller.username_required'));
      return;
    }

    if (trimmedUsername.length < 3) {
      setError(t('seller.username_min'));
      return;
    }

    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/seller/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedUsername }),
      });

      if (response.status === 409) {
        setError(t('seller.username_taken'));
        return;
      }

      if (!response.ok) {
        throw new Error(`Seller activation failed with status ${response.status}`);
      }

      // Refresh auth state
      await refreshUser();
      
      toast.success(t('seller.activate_success'));
      navigate('/seller/new-product');
    } catch (err) {
      console.error('Activation error:', err);
      setError(t('seller.activate_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full border border-[hsl(var(--border))] shadow-none bg-white">
      <CardHeader className="text-center pb-3 px-6 pt-8 md:px-8">
        <div className="w-16 h-16 bg-blue-50 rounded-[8px] flex items-center justify-center mx-auto mb-5 text-[#0000FF]">
          <Store className="w-8 h-8" />
        </div>
        <CardTitle className="text-2xl font-['Playfair_Display'] text-gray-950">{t('seller.activate_title')}</CardTitle>
        <CardDescription className="text-base leading-7">
          {t('seller.activate_body')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8 pt-5 md:px-8">
        <form onSubmit={handleActivate} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="username" className="text-base font-medium text-gray-900">{t('seller.username')} *</Label>
            <Input 
              id="username" 
              placeholder={t('seller.username_placeholder')} 
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="h-12 rounded-[8px] border-[hsl(var(--border))] bg-[#f7f8fb] text-base focus-visible:ring-blue-100 focus-visible:ring-offset-0"
              required
            />
            <p className="text-sm leading-6 text-muted-foreground">
              {t('seller.username_note')}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[8px] border border-red-100 bg-red-50 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full min-h-12 h-auto rounded-[8px] bg-[#0000FF] px-4 py-3 text-base md:text-lg font-semibold leading-snug whitespace-normal text-center text-white gap-2 shadow-none hover:bg-[#0000CC]"
          >
            <span className="min-w-0">{loading ? t('seller.activating') : t('seller.become_button')}</span>
            {!loading && <ArrowRight className="w-5 h-5 shrink-0 text-white" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SellerActivationFlow;
