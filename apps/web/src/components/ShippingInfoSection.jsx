import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const primaryActionClass = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[#0000FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0000CC] disabled:pointer-events-none disabled:opacity-60';
const secondaryActionClass = 'inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#151515] transition-colors hover:border-[#0000FF]/35 hover:bg-[#f3f3ff] disabled:pointer-events-none disabled:opacity-60';

const ShippingInfoSection = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingId, setShippingId] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: t('checkout.country_default'),
    phone_number: ''
  });

  useEffect(() => {
    const fetchShippingInfo = async () => {
      if (!currentUser) return;
      try {
        const records = await pb.collection('shipping_info').getFullList({
          filter: `user_id = "${currentUser.id}"`,
          $autoCancel: false
        });
        
        if (records.length > 0) {
          const info = records[0];
          setShippingId(info.id);
          setFormData({
            full_name: info.full_name || '',
            street_address: info.street_address || '',
            city: info.city || '',
            postal_code: info.postal_code || '',
            country: info.country || t('checkout.country_default'),
            phone_number: info.phone_number || ''
          });
        }
      } catch (error) {
        console.error('Error fetching shipping info:', error);
      }
    };

    fetchShippingInfo();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.street_address || !formData.city || !formData.postal_code) {
      toast.error(t('checkout.required_toast'));
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        user_id: currentUser.id
      };

      if (shippingId) {
        await pb.collection('shipping_info').update(shippingId, dataToSave, { $autoCancel: false });
      } else {
        const record = await pb.collection('shipping_info').create(dataToSave, { $autoCancel: false });
        setShippingId(record.id);
      }
      
      toast.success(t('shipping.save_success'));
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving shipping info:', error);
      toast.error(t('shipping.save_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-black/12 bg-white">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t('shipping.title')}</h2>
          {!isEditing && (
            <button type="button" className={secondaryActionClass} onClick={() => setIsEditing(true)}>
              {t('seller.edit')}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t('checkout.full_name')} *</Label>
              <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="street_address">{t('checkout.street')} *</Label>
              <Input id="street_address" name="street_address" value={formData.street_address} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">{t('checkout.postal_code')} *</Label>
                <Input id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t('checkout.city')} *</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">{t('checkout.country')}</Label>
                <Input id="country" name="country" value={formData.country} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">{t('shipping.phone')}</Label>
                <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleSave} disabled={loading} className={primaryActionClass}>
                {loading ? t('shipping.saving') : t('shipping.save')}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} disabled={loading} className={secondaryActionClass}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {formData.full_name ? (
              <>
                <div>
                  <p className="text-muted-foreground">{t('shipping.name')}</p>
                  <p className="font-medium">{formData.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('shipping.address')}</p>
                  <p className="font-medium">{formData.street_address}</p>
                  <p className="font-medium">{formData.postal_code} {formData.city}</p>
                  <p className="font-medium">{formData.country}</p>
                </div>
                {formData.phone_number && (
                  <div>
                    <p className="text-muted-foreground">{t('shipping.phone')}</p>
                    <p className="font-medium">{formData.phone_number}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">{t('shipping.empty')}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShippingInfoSection;
