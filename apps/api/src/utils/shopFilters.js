import pb from './pocketbaseClient.js';

const DEFAULT_FILTERS = [
  {
    id: 'default_product_type',
    key: 'product_type',
    label: 'Product type',
    labelDe: 'Produkttyp',
    labelEn: 'Product type',
    type: 'checkbox_group',
    scope: ['shop', 'marketplace'],
    parameterKey: 'productTypes',
    productField: 'product_type',
    operator: 'equals',
    appliesToProductType: [],
    active: true,
    sortOrder: 10,
    metadata: {},
    options: [
      { id: 'default_product_type_article', value: 'Article', label: 'Article', labelDe: 'Artikel', labelEn: 'Article', sortOrder: 10 },
      { id: 'default_product_type_set', value: 'Set', label: 'Set', labelDe: 'Set', labelEn: 'Set', sortOrder: 20 },
      { id: 'default_product_type_consumable', value: 'Consumable', label: 'Consumable', labelDe: 'Verbrauchsmaterial', labelEn: 'Consumable', sortOrder: 30 },
    ],
  },
  {
    id: 'default_condition',
    key: 'condition',
    label: 'Condition',
    labelDe: 'Zustand',
    labelEn: 'Condition',
    type: 'checkbox_group',
    scope: ['shop', 'marketplace'],
    parameterKey: 'conditions',
    productField: 'condition',
    operator: 'equals',
    appliesToProductType: [],
    active: true,
    sortOrder: 20,
    metadata: {},
    options: [
      { id: 'default_condition_new', value: 'Neu', label: 'New', labelDe: 'Neu', labelEn: 'New', sortOrder: 10 },
      { id: 'default_condition_like_new', value: 'Wie neu', label: 'Like new', labelDe: 'Wie neu', labelEn: 'Like new', sortOrder: 20 },
      { id: 'default_condition_good', value: 'Gut', label: 'Good', labelDe: 'Gut', labelEn: 'Good', sortOrder: 30 },
      { id: 'default_condition_satisfactory', value: 'Befriedigend', label: 'Satisfactory', labelDe: 'Befriedigend', labelEn: 'Satisfactory', sortOrder: 40 },
    ],
  },
  {
    id: 'default_fachbereich',
    key: 'fachbereich',
    label: 'Subject area',
    labelDe: 'Fachbereich',
    labelEn: 'Subject area',
    type: 'checkbox_group',
    scope: ['shop', 'marketplace'],
    parameterKey: 'fachbereiche',
    productField: 'fachbereich',
    operator: 'contains',
    appliesToProductType: [],
    active: true,
    sortOrder: 30,
    metadata: {},
    options: [
      { id: 'default_subject_paro', value: 'Paro', label: 'Periodontology', labelDe: 'Parodontologie', labelEn: 'Periodontology', sortOrder: 10 },
      { id: 'default_subject_kons', value: 'Kons', label: 'Conservative dentistry', labelDe: 'Konservierende Zahnheilkunde', labelEn: 'Conservative dentistry', sortOrder: 20 },
      { id: 'default_subject_pro', value: 'Pro', label: 'Prosthodontics', labelDe: 'Prothetik', labelEn: 'Prosthodontics', sortOrder: 30 },
      { id: 'default_subject_kfo', value: 'KFO', label: 'Orthodontics', labelDe: 'Kieferorthopädie', labelEn: 'Orthodontics', sortOrder: 40 },
    ],
  },
];

const safeJson = (value, fallback = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const serializeFilterOption = (record) => ({
  id: record.id,
  filterKey: record.filter_key || '',
  value: record.value || '',
  label: record.label || record.value || '',
  labelDe: record.label_de || record.label || record.value || '',
  labelEn: record.label_en || record.label || record.value || '',
  active: record.active !== false,
  sortOrder: Number(record.sort_order || 0),
  metadata: safeJson(record.metadata),
});

const serializeFilter = (record, options = []) => ({
  id: record.id,
  key: record.key || '',
  label: record.label || record.key || '',
  labelDe: record.label_de || record.label || record.key || '',
  labelEn: record.label_en || record.label || record.key || '',
  type: record.type || 'checkbox_group',
  scope: Array.isArray(record.scope) ? record.scope : record.scope ? [record.scope] : [],
  parameterKey: record.parameter_key || record.key || '',
  productField: record.product_field || record.key || '',
  operator: record.operator || 'equals',
  appliesToProductType: Array.isArray(record.applies_to_product_type)
    ? record.applies_to_product_type
    : record.applies_to_product_type
      ? [record.applies_to_product_type]
      : [],
  active: record.active !== false,
  sortOrder: Number(record.sort_order || 0),
  metadata: safeJson(record.metadata),
  options,
});

const filterForScope = (scope) => (filterDefinition) =>
  filterDefinition.active === true
  && filterDefinition.scope.includes(scope)
  && (
    filterDefinition.type === 'price_range'
    || filterDefinition.options.some((option) => option.active !== false)
  );

const sortByOrder = (a, b) =>
  Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  || String(a.label || '').localeCompare(String(b.label || ''));

export const getShopFilterDefinitions = async (scope = 'shop') => {
  const normalizedScope = scope === 'marketplace' ? 'marketplace' : 'shop';

  const filterRecords = await pb.collection('shop_filters').getFullList({
    filter: `active=true && scope~"${normalizedScope}"`,
    sort: 'sort_order,label',
    $autoCancel: false,
  }).catch(() => []);

  if (filterRecords.length === 0) {
    return DEFAULT_FILTERS.filter(filterForScope(normalizedScope)).map((filterDefinition) => ({
      ...filterDefinition,
      options: [...filterDefinition.options].sort(sortByOrder),
    }));
  }

  const optionRecords = await pb.collection('shop_filter_options').getFullList({
    filter: 'active=true',
    sort: 'filter_key,sort_order,label',
    $autoCancel: false,
  }).catch(() => []);
  const optionsByFilterKey = new Map();

  for (const optionRecord of optionRecords) {
    const serializedOption = serializeFilterOption(optionRecord);
    const currentOptions = optionsByFilterKey.get(serializedOption.filterKey) || [];
    currentOptions.push(serializedOption);
    optionsByFilterKey.set(serializedOption.filterKey, currentOptions);
  }

  return filterRecords
    .map((filterRecord) => serializeFilter(
      filterRecord,
      (optionsByFilterKey.get(filterRecord.key) || []).sort(sortByOrder),
    ))
    .filter(filterForScope(normalizedScope))
    .sort(sortByOrder);
};

export const buildDynamicProductFilters = ({ query, definitions }) => {
  const filters = [];

  for (const definition of definitions || []) {
    if (definition.type === 'price_range') {
      const minKey = definition.metadata?.minParameterKey || `${definition.parameterKey || definition.key}Min`;
      const maxKey = definition.metadata?.maxParameterKey || `${definition.parameterKey || definition.key}Max`;
      const minValue = Number(query?.[minKey]);
      const maxValue = Number(query?.[maxKey]);
      const field = definition.productField || 'price';

      if (Number.isFinite(minValue) && minValue >= 0) {
        filters.push(`${field}>=${minValue}`);
      }

      if (Number.isFinite(maxValue) && maxValue >= 0) {
        filters.push(`${field}<=${maxValue}`);
      }

      continue;
    }

    if (definition.type !== 'checkbox_group' && definition.type !== 'dropdown') {
      continue;
    }

    const parameterKey = definition.parameterKey;
    const rawValue = query?.[parameterKey];
    const values = Array.isArray(rawValue) ? rawValue : rawValue ? String(rawValue).split(',') : [];
    const allowedValues = new Set((definition.options || []).map((option) => String(option.value || '')));
    const safeValues = values.map((value) => String(value || '').trim()).filter((value) => value && allowedValues.has(value));

    if (safeValues.length === 0) {
      continue;
    }

    const escapedField = definition.productField;
    const operator = definition.operator === 'contains' ? '~' : '=';
    filters.push(`(${safeValues.map((value) => `${escapedField}${operator}"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(' || ')})`);
  }

  return filters;
};
