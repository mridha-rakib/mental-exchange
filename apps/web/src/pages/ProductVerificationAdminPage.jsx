import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';

const ProductVerificationAdminPage = () => {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchPendingProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch products that have status pending_verification
      const result = await pb.collection('products').getList(1, 50, {
        filter: 'status="pending_verification"',
        sort: '-created',
        $autoCancel: false
      });
      setPendingProducts(result.items);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      toast.error('Fehler beim Laden der zu prüfenden Produkte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingProducts();
  }, [fetchPendingProducts]);

  const handleApprove = async (product) => {
    setProcessingId(product.id);
    try {
      const response = await apiServerClient.fetch('/admin/approve-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      
      if (!response.ok) throw new Error('Approval failed');
      
      toast.success('Produkt erfolgreich verifiziert und freigegeben.');
      setPendingProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Fehler bei der Freigabe des Produkts.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (product) => {
    const reason = window.prompt('Bitte gib einen Grund für die Ablehnung ein (wird an den Verkäufer gesendet):');
    if (reason === null) return; // User cancelled

    setProcessingId(product.id);
    try {
      const response = await apiServerClient.fetch('/admin/reject-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, reason: reason || 'Entspricht nicht den Richtlinien.' })
      });
      
      if (!response.ok) throw new Error('Rejection failed');
      
      toast.success('Produkt abgelehnt und gelöscht.');
      setPendingProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Fehler bei der Ablehnung des Produkts.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Lade ausstehende Verifizierungen...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Produkt-Verifizierungen</h2>
          <p className="text-muted-foreground">
            Prüfe neu eingestellte Artikel mit Zustand "Neu" oder "Wie neu".
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {pendingProducts.length} Ausstehend
        </Badge>
      </div>

      {pendingProducts.length === 0 ? (
        <div className="bg-white border rounded-[8px] p-12 text-center flex flex-col items-center shadow-card">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">Alles erledigt!</h3>
          <p className="text-muted-foreground">Es gibt aktuell keine Produkte, die auf eine Verifizierung warten.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-[8px] shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Bild</TableHead>
                <TableHead>Produkt</TableHead>
                <TableHead>Verkäufer</TableHead>
                <TableHead>Zustand</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-12 h-12 rounded-md bg-muted overflow-hidden border">
                      {product.image ? (
                        <img 
                          src={pb.files.getUrl(product, product.image)} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Bild</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {product.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.seller_username}</span>
                      <a href={`/profile/${product.seller_id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                      {product.condition}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    €{product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleApprove(product)}
                        disabled={processingId === product.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Freigeben
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleReject(product)}
                        disabled={processingId === product.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Ablehnen
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProductVerificationAdminPage;
