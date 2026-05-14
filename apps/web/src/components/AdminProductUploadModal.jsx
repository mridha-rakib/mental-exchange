import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const AdminProductUploadModal = ({ children, onSuccess }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    stock_quantity: '1',
    weight_g: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const parcelWeight = Number(formData.weight_g);

    if (!formData.name || !formData.price || !formData.category || !formData.condition || !formData.stock_quantity || !Number.isFinite(parcelWeight) || parcelWeight <= 0) {
      toast.error(t('checkout.required_toast'));
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('fachbereich', formData.category); // Map category to fachbereich
      data.append('condition', formData.condition);
      data.append('stock_quantity', formData.stock_quantity);
      data.append('weight_g', String(Math.round(parcelWeight)));
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      await pb.collection('shop_products').create(data, { $autoCancel: false });
      
      toast.success(t('admin_product.add_success'));
      setOpen(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        stock_quantity: '1',
        weight_g: ''
      });
      setImageFile(null);
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('admin_product.add_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-['Playfair_Display']">{t('admin_product.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('seller.product_name')} *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('new_product.description')}</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('seller.price')} (EUR) *</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">{t('admin_product.stock')} *</Label>
              <Input id="stock_quantity" name="stock_quantity" type="number" min="1" value={formData.stock_quantity} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_g">{t('product.weight_g')} *</Label>
              <Input id="weight_g" name="weight_g" type="number" min="1" step="1" value={formData.weight_g} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('admin_product.category')} *</Label>
              <Select onValueChange={(val) => setFormData({...formData, category: val})} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paro">Paro</SelectItem>
                  <SelectItem value="Kons">Kons</SelectItem>
                  <SelectItem value="KFO">KFO</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">{t('marketplace.condition')} *</Label>
              <Select onValueChange={(val) => setFormData({...formData, condition: val})} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Neu">{t('marketplace.condition_new')}</SelectItem>
                  <SelectItem value="Wie neu">{t('marketplace.condition_like_new')}</SelectItem>
                  <SelectItem value="Gut">{t('marketplace.condition_good')}</SelectItem>
                  <SelectItem value="Befriedigend">{t('marketplace.condition_satisfactory')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">{t('new_product.product_image')}</Label>
            <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="bg-[#0000FF] hover:bg-[#0000CC] text-white" disabled={loading}>
              {loading ? t('shipping.saving') : t('admin_product.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminProductUploadModal;
