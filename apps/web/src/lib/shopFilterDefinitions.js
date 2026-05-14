export const DEFAULT_SHOP_FILTER_DEFINITIONS = [
  {
    key: 'product_type',
    labelDe: 'Produkttyp',
    labelEn: 'Product type',
    type: 'checkbox_group',
    parameterKey: 'productTypes',
    options: [
      { value: 'Article', labelDe: 'Artikel', labelEn: 'Article' },
      { value: 'Set', labelDe: 'Set', labelEn: 'Set' },
      { value: 'Consumable', labelDe: 'Verbrauchsmaterial', labelEn: 'Consumable' },
    ],
  },
  {
    key: 'condition',
    labelDe: 'Zustand',
    labelEn: 'Condition',
    type: 'checkbox_group',
    parameterKey: 'conditions',
    options: [
      { value: 'Neu', labelDe: 'Neu', labelEn: 'New' },
      { value: 'Wie neu', labelDe: 'Wie neu', labelEn: 'Like new' },
      { value: 'Gut', labelDe: 'Gut', labelEn: 'Good' },
      { value: 'Befriedigend', labelDe: 'Befriedigend', labelEn: 'Satisfactory' },
    ],
  },
  {
    key: 'fachbereich',
    labelDe: 'Fachbereich',
    labelEn: 'Subject area',
    type: 'checkbox_group',
    parameterKey: 'fachbereiche',
    options: [
      { value: 'Paro', labelDe: 'Parodontologie', labelEn: 'Periodontology' },
      { value: 'Kons', labelDe: 'Konservierende Zahnheilkunde', labelEn: 'Conservative dentistry' },
      { value: 'Pro', labelDe: 'Prothetik', labelEn: 'Prosthodontics' },
      { value: 'KFO', labelDe: 'Kieferorthopädie', labelEn: 'Orthodontics' },
    ],
  },
];

export const getVisibleFilterDefinitions = (definitions = []) =>
  (Array.isArray(definitions) && definitions.length > 0 ? definitions : DEFAULT_SHOP_FILTER_DEFINITIONS)
    .filter((definition) =>
      definition
      && definition.type
      && (
        definition.type === 'price_range'
        || (Array.isArray(definition.options) && definition.options.length > 0)
      ));

export const getFilterLabel = (definition, language) => {
  if (language === 'DE') {
    return definition.labelDe || definition.label || definition.key || '';
  }

  return definition.labelEn || definition.label || definition.key || '';
};

export const getFilterOptionLabel = (option, language) => {
  if (language === 'DE') {
    return option.labelDe || option.label || option.value || '';
  }

  return option.labelEn || option.label || option.value || '';
};

export const getRangeParameterKeys = (definition) => ({
  minKey: definition.metadata?.minParameterKey || `${definition.parameterKey || definition.key}Min`,
  maxKey: definition.metadata?.maxParameterKey || `${definition.parameterKey || definition.key}Max`,
});

export const getEmptyFilterValues = (definitions = []) => {
  const emptyValues = {};

  for (const definition of getVisibleFilterDefinitions(definitions)) {
    if (definition.type === 'price_range') {
      const { minKey, maxKey } = getRangeParameterKeys(definition);
      emptyValues[minKey] = '';
      emptyValues[maxKey] = '';
    } else {
      emptyValues[definition.parameterKey] = [];
    }
  }

  return emptyValues;
};

export const getActiveFilterEntries = ({ filters = {}, definitions = [], language = 'DE' }) => {
  const entries = [];

  for (const definition of getVisibleFilterDefinitions(definitions)) {
    if (definition.type === 'price_range') {
      const { minKey, maxKey } = getRangeParameterKeys(definition);
      const minValue = String(filters[minKey] || '').trim();
      const maxValue = String(filters[maxKey] || '').trim();
      if (minValue || maxValue) {
        entries.push({
          key: definition.key,
          label: `${getFilterLabel(definition, language)}: ${minValue || '0'} - ${maxValue || '*'}`,
        });
      }
      continue;
    }

    const selectedValues = Array.isArray(filters[definition.parameterKey]) ? filters[definition.parameterKey] : [];
    for (const value of selectedValues) {
      const option = definition.options.find((item) => item.value === value);
      entries.push({
        key: `${definition.key}-${value}`,
        label: option ? getFilterOptionLabel(option, language) : value,
      });
    }
  }

  return entries;
};

export const appendFilterSearchParams = ({ params, filters = {}, definitions = [] }) => {
  for (const definition of getVisibleFilterDefinitions(definitions)) {
    if (definition.type === 'price_range') {
      const { minKey, maxKey } = getRangeParameterKeys(definition);
      const minValue = String(filters[minKey] || '').trim();
      const maxValue = String(filters[maxKey] || '').trim();
      if (minValue) params.append(minKey, minValue);
      if (maxValue) params.append(maxKey, maxValue);
      continue;
    }

    const selectedValues = Array.isArray(filters[definition.parameterKey]) ? filters[definition.parameterKey] : [];
    selectedValues.forEach((value) => params.append(definition.parameterKey, value));
  }
};
