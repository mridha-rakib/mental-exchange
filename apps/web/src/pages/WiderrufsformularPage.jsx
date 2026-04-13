import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';

const WiderrufsformularPage = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bestelltAm: '',
    erhaltenAm: '',
    name: '',
    anschrift: '',
    unterschrift: '',
    datum: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiServerClient.fetch('/email/send-withdrawal-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Fehler beim Senden des Formulars');
      }

      toast.success('Widerrufsformular erfolgreich gesendet.');
      setFormData({
        bestelltAm: '',
        erhaltenAm: '',
        name: '',
        anschrift: '',
        unterschrift: '',
        datum: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Withdrawal form error:', error);
      toast.error('Fehler beim Senden. Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Muster-Widerrufsformular - Zahnibörse</title>
      </Helmet>
      <PageShell
        eyebrow="Rechtliches"
        title="Muster-Widerrufsformular"
        description="Fülle dieses Formular aus, wenn du den Vertrag widerrufen möchtest."
        maxWidth="max-w-3xl"
      >
        <ContentPanel>
            
            <p className="text-[hsl(var(--secondary-text))] mb-8">
              Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.
            </p>

            <div className="bg-[hsl(var(--muted-bg))] p-4 rounded-[8px] border border-[hsl(var(--border))] mb-8 text-sm">
              <strong>An:</strong><br />
              Patrick Tchoquessi Wetie<br />
              Zahnibörse<br />
              Angelika-Machinek Straße 12<br />
              60486 Frankfurt<br />
              E-Mail: info@zahniboerse.com
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bestelltAm">Bestellt am *</Label>
                  <Input 
                    type="date" 
                    id="bestelltAm" 
                    name="bestelltAm" 
                    value={formData.bestelltAm} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erhaltenAm">Erhalten am *</Label>
                  <Input 
                    type="date" 
                    id="erhaltenAm" 
                    name="erhaltenAm" 
                    value={formData.erhaltenAm} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name des/der Verbraucher(s) *</Label>
                <Input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anschrift">Anschrift des/der Verbraucher(s) *</Label>
                <Textarea
                  id="anschrift" 
                  name="anschrift" 
                  rows="3"
                  value={formData.anschrift} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="unterschrift">Unterschrift (optional)</Label>
                  <Input 
                    type="text" 
                    id="unterschrift" 
                    name="unterschrift" 
                    placeholder="Name als digitale Unterschrift"
                    value={formData.unterschrift} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datum">Datum *</Label>
                  <Input 
                    type="date" 
                    id="datum" 
                    name="datum" 
                    value={formData.datum} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#0000FF] hover:bg-[#0000CC] text-white min-h-[44px] mt-4"
                disabled={loading}
              >
                {loading ? 'Wird gesendet...' : 'Widerruf absenden'}
              </Button>
            </form>
        </ContentPanel>
      </PageShell>
    </>
  );
};

export default WiderrufsformularPage;
