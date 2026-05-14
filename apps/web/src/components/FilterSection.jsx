import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { useTranslation } from '@/contexts/TranslationContext.jsx';
import {
  getEmptyFilterValues,
  getFilterLabel,
  getFilterOptionLabel,
  getRangeParameterKeys,
  getVisibleFilterDefinitions,
} from '@/lib/shopFilterDefinitions.js';

const FilterGroup = ({ definition, selectedValues, onToggle, language }) => {
  return (
    <div className="border-t border-[#ddd] pt-5 first:border-t-0 first:pt-0">
      <Label className="text-[15px] font-semibold text-[#444]">{getFilterLabel(definition, language)}</Label>
      <div className="mt-3 space-y-2">
        {definition.options.map((item) => {
          const checked = selectedValues.includes(item.value);
          const inputId = `${definition.key}-${item.value}`.replace(/\s+/g, '-');

          return (
            <label
              key={item.value}
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer items-center gap-2 text-[15px] text-[#444] transition-colors hover:text-[#0000FF]',
                checked && 'text-[#0000FF]'
              )}
            >
              <Checkbox id={inputId} checked={checked} onCheckedChange={() => onToggle(item.value)} />
              <span>{getFilterOptionLabel(item, language)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

const PriceRangeGroup = ({ definition, filters, onRangeChange, language, t }) => {
  const { minKey, maxKey } = getRangeParameterKeys(definition);

  return (
    <div className="border-t border-[#ddd] pt-5 first:border-t-0 first:pt-0">
      <Label className="text-[15px] font-semibold text-[#444]">{getFilterLabel(definition, language)}</Label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input
          type="number"
          min="0"
          inputMode="decimal"
          value={filters[minKey] || ''}
          onChange={(event) => onRangeChange(minKey, event.target.value)}
          placeholder={t('marketplace.price_min')}
          className="h-10 rounded-[8px] border-[#d7d7d7] text-sm shadow-none"
        />
        <Input
          type="number"
          min="0"
          inputMode="decimal"
          value={filters[maxKey] || ''}
          onChange={(event) => onRangeChange(maxKey, event.target.value)}
          placeholder={t('marketplace.price_max')}
          className="h-10 rounded-[8px] border-[#d7d7d7] text-sm shadow-none"
        />
      </div>
    </div>
  );
};

const FilterSection = ({ filters = {}, filterDefinitions = [], onFiltersChange, className }) => {
  const { t, language } = useTranslation();
  const visibleDefinitions = getVisibleFilterDefinitions(filterDefinitions);

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

  const updateRangeValue = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange(getEmptyFilterValues(visibleDefinitions));
  };

  const hasActiveFilters = visibleDefinitions.some((definition) => {
    if (definition.type === 'price_range') {
      const { minKey, maxKey } = getRangeParameterKeys(definition);
      return Boolean(filters[minKey] || filters[maxKey]);
    }

    return (filters[definition.parameterKey] || []).length > 0;
  });

  return (
    <div className={cn('rounded-[14px] border border-[#d7d7d7] bg-white px-5 py-6 shadow-[0_2px_6px_rgba(15,23,42,0.05)]', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-[#0000FF]" />
          <h3 className="font-serif text-[20px] font-semibold text-[#333]">{t('marketplace.filter')}</h3>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 rounded-[8px] px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <RotateCcw className="size-4" />
          </Button>
        )}
      </div>

      <div className="mt-7 space-y-5">
        {visibleDefinitions.map((definition) => (
          definition.type === 'price_range' ? (
            <PriceRangeGroup
              key={definition.key}
              definition={definition}
              filters={filters}
              onRangeChange={updateRangeValue}
              language={language}
              t={t}
            />
          ) : (
            <FilterGroup
              key={definition.key}
              definition={definition}
              selectedValues={filters[definition.parameterKey] || []}
              onToggle={(value) => toggleValue(definition.parameterKey, value)}
              language={language}
            />
          )
        ))}
      </div>
    </div>
  );
};

export default FilterSection;
