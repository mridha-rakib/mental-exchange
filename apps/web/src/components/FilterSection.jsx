import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const PRODUCT_TYPES = [
  { id: 'Article', labelKey: 'marketplace.type_article' },
  { id: 'Set', labelKey: 'marketplace.type_set' },
  { id: 'Consumable', labelKey: 'marketplace.type_consumable' },
];

const CONDITIONS = [
  { id: 'Neu', labelKey: 'marketplace.condition_new' },
  { id: 'Wie neu', labelKey: 'marketplace.condition_like_new' },
  { id: 'Gut', labelKey: 'marketplace.condition_good' },
  { id: 'Befriedigend', labelKey: 'marketplace.condition_satisfactory' },
];

const SUBJECTS = [
  { id: 'Paro', labelKey: 'marketplace.subject_paro' },
  { id: 'Kons', labelKey: 'marketplace.subject_kons' },
  { id: 'Pro', labelKey: 'marketplace.subject_pro' },
  { id: 'KFO', labelKey: 'marketplace.subject_kfo' },
];

const emptyFilters = {
  productTypes: [],
  conditions: [],
  fachbereiche: [],
};

const FilterGroup = ({ title, items, selectedValues, onToggle, t }) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</Label>
      <div className="space-y-2">
        {items.map((item) => {
          const checked = selectedValues.includes(item.id);

          return (
            <label
              key={item.id}
              htmlFor={item.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition-colors',
                checked ? 'bg-[#0000FF]/6' : 'bg-slate-50 hover:bg-slate-100'
              )}
            >
              <Checkbox id={item.id} checked={checked} onCheckedChange={() => onToggle(item.id)} />
              <span className="text-sm font-medium text-slate-700">{t(item.labelKey)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

const FilterSection = ({ filters = emptyFilters, onFiltersChange, className }) => {
  const { t } = useTranslation();

  const toggleValue = (key, value) => {
    const currentValues = filters[key] || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    onFiltersChange({
      ...filters,
      [key]: nextValues,
    });
  };

  const clearFilters = () => {
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters =
    filters.productTypes.length > 0 || filters.conditions.length > 0 || filters.fachbereiche.length > 0;

  return (
    <div className={cn('rounded-[28px] border border-black/5 bg-white p-5 md:p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#0000FF]/8 p-2 text-[#0000FF]">
            <Filter className="size-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('marketplace.filter')}</h3>
            <p className="text-sm text-slate-500">{t('marketplace.adjust_filters')}</p>
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 rounded-full px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <RotateCcw className="size-4" />
            {t('marketplace.reset_filters')}
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <FilterGroup
          title={t('marketplace.product_type')}
          items={PRODUCT_TYPES}
          selectedValues={filters.productTypes}
          onToggle={(value) => toggleValue('productTypes', value)}
          t={t}
        />

        <FilterGroup
          title={t('marketplace.condition')}
          items={CONDITIONS}
          selectedValues={filters.conditions}
          onToggle={(value) => toggleValue('conditions', value)}
          t={t}
        />

        <FilterGroup
          title={t('marketplace.subject')}
          items={SUBJECTS}
          selectedValues={filters.fachbereiche}
          onToggle={(value) => toggleValue('fachbereiche', value)}
          t={t}
        />
      </div>
    </div>
  );
};

export default FilterSection;
