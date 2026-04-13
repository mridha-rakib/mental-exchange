import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

const ProductUploadForm = () => {
  const { currentUser, isSeller } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    condition: '',
    product_type: 'Article',
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
    if (!isSeller) {
      toast.error('Du musst als Verkäufer registriert sein.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('condition', formData.condition);
      data.append('product_type', formData.product_type);
      data.append('seller_id', currentUser.id);
      data.append('seller_username', currentUser.seller_username || currentUser.name);
      
      // Status logic based on condition
      const status = (formData.condition === 'Neu' || formData.condition === 'Wie neu') 
        ? 'pending_verification' 
        : 'active';
      data.append('status', status);

      if (imageFile) {
        data.append('image', imageFile);
      }

      await pb.collection('products').create(data, { $autoCancel: false });
      
      toast.success(status === 'pending_verification' 
        ? 'Produkt eingereicht! Es wird nun geprüft.' 
        : 'Produkt erfolgreich veröffentlicht!');
      
      navigate('/seller-dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Hochladen des Produkts.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSeller) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Werde Verkäufer</h2>
        <p className="text-[hsl(var(--secondary-text))] mb-8 max-w-md">
          Um Produkte auf der Zahnibörse anzubieten, musst du dein Profil als Verkäufer aktivieren.
        </p>
        <Button onClick={() => navigate('/profile')}>Zum Profil</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Produkt verkaufen - Zahnibörse</title>
      </Helmet>

      <main className="flex-1 bg-[hsl(var(--muted-bg))] py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-[var(--radius-lg)] shadow-card p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-8">Neues Produkt einstellen</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Titel des Produkts *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="z.B. Artikulator Pro" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Beschreibe den Zustand und Lieferumfang..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price">Preis (€) *</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Zustand *</Label>
                  <Select onValueChange={(val) => setFormData({...formData, condition: val})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Neu">Neu</SelectItem>
                      <SelectItem value="Wie neu">Wie neu</SelectItem>
                      <SelectItem value="Gut">Gut</SelectItem>
                      <SelectItem value="Befriedigend">Befriedigend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Produktbild</Label>
                <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
              </div>

              <div className="pt-4 border-t border-[hsl(var(--border))]">
                <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-white h-12 text-lg" disabled={loading}>
                  {loading ? 'Wird hochgeladen...' : 'Produkt veröffentlichen'}
                </Button>
                <p className="text-xs text-center text-[hsl(var(--secondary-text))] mt-4">
                  Hinweis: Produkte mit Zustand "Neu" oder "Wie neu" werden vor der Veröffentlichung von uns geprüft.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProductUploadForm;