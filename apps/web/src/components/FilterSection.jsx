import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { Label } from '@/components/ui/label.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const PRODUCT_TYPES = [
  { id: 'Article', labelKey: 'marketplace.type_article' },
  { id: 'Set', labelKey: 'marketplace.type_set' },
  { id: 'Consumable', labelKey: 'marketplace.type_consumable' }
];
const CONDITIONS = ['Neu', 'Wie neu', 'Gut', 'Befriedigend'];
const FACHBEREICHE = ['Paro', 'Kons', 'Pro', 'KFO'];

const FilterSection = ({ onFiltersChange }) => {
  const { t } = useTranslation();
  const [productTypes, setProductTypes] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [fachbereiche, setFachbereiche] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ productTypes, conditions, fachbereiche });
    }, 300);
    return () => clearTimeout(timer);
  }, [productTypes, conditions, fachbereiche, onFiltersChange]);

  const handleProductTypeToggle = (pt) => {
    setProductTypes(prev => 
      prev.includes(pt) 
        ? prev.filter(p => p !== pt)
        : [...prev, pt]
    );
  };

  const handleConditionToggle = (condition) => {
    setConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const handleFachbereichToggle = (fb) => {
    setFachbereiche(prev => 
      prev.includes(fb) 
        ? prev.filter(f => f !== fb)
        : [...prev, fb]
    );
  };

  const clearFilters = () => {
    setProductTypes([]);
    setConditions([]);
    setFachbereiche([]);
  };

  const hasActiveFilters = productTypes.length > 0 || conditions.length > 0 || fachbereiche.length > 0;

  return (
    <div className="bg-white p-5 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Filter size={18} className="text-[hsl(var(--primary))]" /> {t('marketplace.filter')}
        </h3>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="h-8 px-2 text-[hsl(var(--secondary-text))] hover:text-destructive"
          >
            <X size={14} className="mr-1" /> {t('marketplace.reset_filters')}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('marketplace.product_type')}</Label>
          <div className="space-y-2.5">
            {PRODUCT_TYPES.map(pt => (
              <div key={pt.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`pt-${pt.id}`} 
                  checked={productTypes.includes(pt.id)}
                  onCheckedChange={() => handleProductTypeToggle(pt.id)}
                />
                <Label 
                  htmlFor={`pt-${pt.id}`} 
                  className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t(pt.labelKey)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('marketplace.condition')}</Label>
          <div className="space-y-2.5">
            {CONDITIONS.map(condition => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox 
                  id={`cond-${condition}`} 
                  checked={conditions.includes(condition)}
                  onCheckedChange={() => handleConditionToggle(condition)}
                />
                <Label 
                  htmlFor={`cond-${condition}`} 
                  className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {condition === 'Neu' ? t('marketplace.condition_new') : condition === 'Wie neu' ? t('marketplace.condition_like_new') : condition === 'Gut' ? t('marketplace.condition_good') : t('marketplace.condition_satisfactory')}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('marketplace.subject')}</Label>
          <div className="space-y-2.5">
            {FACHBEREICHE.map(fb => (
              <div key={fb} className="flex items-center space-x-2">
                <Checkbox 
                  id={`fb-${fb}`} 
                  checked={fachbereiche.includes(fb)}
                  onCheckedChange={() => handleFachbereichToggle(fb)}
                />
                <Label 
                  htmlFor={`fb-${fb}`} 
                  className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {fb === 'Kons' ? t('marketplace.subject_kons') : fb === 'Pro' ? t('marketplace.subject_pro') : fb === 'KFO' ? t('marketplace.subject_kfo') : t('marketplace.subject_paro')}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
