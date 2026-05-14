/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const saveCollection = (config) => {
    const collection = new Collection(config);

    try {
      app.save(collection);
    } catch (error) {
      if (!error.message.includes("Collection name must be unique")) {
        throw error;
      }
    }
  };

  const adminRule = "@request.auth.is_admin = true";

  saveCollection({
    createRule: adminRule,
    deleteRule: adminRule,
    fields: [
      { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_shop_filter_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
      { hidden: false, id: "text_shop_filter_key", name: "key", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "^[a-z0-9_]+$" },
      { hidden: false, id: "text_shop_filter_label", name: "label", required: true, system: false, type: "text", autogeneratePattern: "", max: 160, min: 1, pattern: "" },
      { hidden: false, id: "text_shop_filter_label_de", name: "label_de", required: false, system: false, type: "text", autogeneratePattern: "", max: 160, min: 0, pattern: "" },
      { hidden: false, id: "text_shop_filter_label_en", name: "label_en", required: false, system: false, type: "text", autogeneratePattern: "", max: 160, min: 0, pattern: "" },
      { hidden: false, id: "select_shop_filter_type", name: "type", required: true, system: false, type: "select", maxSelect: 1, values: ["dropdown", "checkbox_group", "price_range"] },
      { hidden: false, id: "select_shop_filter_scope", name: "scope", required: true, system: false, type: "select", maxSelect: 2, values: ["shop", "marketplace"] },
      { hidden: false, id: "text_shop_filter_param", name: "parameter_key", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "^[A-Za-z0-9_]+$" },
      { hidden: false, id: "text_shop_filter_field", name: "product_field", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "^[A-Za-z0-9_]+$" },
      { hidden: false, id: "select_shop_filter_operator", name: "operator", required: true, system: false, type: "select", maxSelect: 1, values: ["equals", "contains", "range"] },
      { hidden: false, id: "select_shop_filter_product_type", name: "applies_to_product_type", required: false, system: false, type: "select", maxSelect: 3, values: ["Article", "Set", "Consumable"] },
      { hidden: false, id: "bool_shop_filter_active", name: "active", required: false, system: false, type: "bool" },
      { hidden: false, id: "number_shop_filter_sort", name: "sort_order", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "json_shop_filter_meta", name: "metadata", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_shop_filter_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_shop_filter_updated", name: "updated", onCreate: true, onUpdate: true, system: false, type: "autodate" },
    ],
    id: "shopflt00000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_shop_filters_key ON shop_filters (key)",
      "CREATE INDEX idx_shop_filters_scope_active_sort ON shop_filters (scope, active, sort_order)",
    ],
    listRule: "",
    name: "shop_filters",
    system: false,
    type: "base",
    updateRule: adminRule,
    viewRule: "",
  });

  saveCollection({
    createRule: adminRule,
    deleteRule: adminRule,
    fields: [
      { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_shop_filter_option_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
      { hidden: false, id: "text_shop_filter_option_filter", name: "filter_key", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "^[a-z0-9_]+$" },
      { hidden: false, id: "text_shop_filter_option_value", name: "value", required: true, system: false, type: "text", autogeneratePattern: "", max: 160, min: 1, pattern: "" },
      { hidden: false, id: "text_shop_filter_option_label", name: "label", required: true, system: false, type: "text", autogeneratePattern: "", max: 160, min: 1, pattern: "" },
      { hidden: false, id: "text_shop_filter_option_label_de", name: "label_de", required: false, system: false, type: "text", autogeneratePattern: "", max: 160, min: 0, pattern: "" },
      { hidden: false, id: "text_shop_filter_option_label_en", name: "label_en", required: false, system: false, type: "text", autogeneratePattern: "", max: 160, min: 0, pattern: "" },
      { hidden: false, id: "bool_shop_filter_option_active", name: "active", required: false, system: false, type: "bool" },
      { hidden: false, id: "number_shop_filter_option_sort", name: "sort_order", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "json_shop_filter_option_meta", name: "metadata", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_shop_filter_option_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_shop_filter_option_updated", name: "updated", onCreate: true, onUpdate: true, system: false, type: "autodate" },
    ],
    id: "shopflo00000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_shop_filter_options_filter_value ON shop_filter_options (filter_key, value)",
      "CREATE INDEX idx_shop_filter_options_filter_active_sort ON shop_filter_options (filter_key, active, sort_order)",
    ],
    listRule: "",
    name: "shop_filter_options",
    system: false,
    type: "base",
    updateRule: adminRule,
    viewRule: "",
  });

  const filterCollection = app.findCollectionByNameOrId("shop_filters");
  const optionCollection = app.findCollectionByNameOrId("shop_filter_options");
  const findOne = (collectionName, filter) => {
    const records = app.findRecordsByFilter(collectionName, filter, "", 1, 0);
    return records.length > 0 ? records[0] : null;
  };
  const seedFilter = (payload) => {
    let record = findOne("shop_filters", `key="${payload.key}"`);
    if (!record) {
      record = new Record(filterCollection);
    }
    Object.entries(payload).forEach(([key, value]) => record.set(key, value));
    app.save(record);
  };
  const seedOption = (payload) => {
    let record = findOne("shop_filter_options", `filter_key="${payload.filter_key}" && value="${payload.value}"`);
    if (!record) {
      record = new Record(optionCollection);
    }
    Object.entries(payload).forEach(([key, value]) => record.set(key, value));
    app.save(record);
  };

  [
    {
      key: "product_type",
      label: "Product type",
      label_de: "Produkttyp",
      label_en: "Product type",
      type: "checkbox_group",
      scope: ["shop", "marketplace"],
      parameter_key: "productTypes",
      product_field: "product_type",
      operator: "equals",
      applies_to_product_type: [],
      active: true,
      sort_order: 10,
      metadata: {},
    },
    {
      key: "condition",
      label: "Condition",
      label_de: "Zustand",
      label_en: "Condition",
      type: "checkbox_group",
      scope: ["shop", "marketplace"],
      parameter_key: "conditions",
      product_field: "condition",
      operator: "equals",
      applies_to_product_type: [],
      active: true,
      sort_order: 20,
      metadata: {},
    },
    {
      key: "fachbereich",
      label: "Fachbereich",
      label_de: "Fachbereich",
      label_en: "Subject area",
      type: "checkbox_group",
      scope: ["shop", "marketplace"],
      parameter_key: "fachbereiche",
      product_field: "fachbereich",
      operator: "contains",
      applies_to_product_type: [],
      active: true,
      sort_order: 30,
      metadata: {},
    },
    {
      key: "price_range",
      label: "Price range",
      label_de: "Preisspanne",
      label_en: "Price range",
      type: "price_range",
      scope: ["shop", "marketplace"],
      parameter_key: "price",
      product_field: "price",
      operator: "range",
      applies_to_product_type: [],
      active: false,
      sort_order: 40,
      metadata: { minParameterKey: "minPrice", maxParameterKey: "maxPrice" },
    },
  ].forEach(seedFilter);

  [
    ["product_type", "Article", "Artikel", "Article", 10],
    ["product_type", "Set", "Set", "Set", 20],
    ["product_type", "Consumable", "Verbrauchsmaterial", "Consumable", 30],
    ["condition", "Neu", "Neu", "New", 10],
    ["condition", "Wie neu", "Wie neu", "Like new", 20],
    ["condition", "Gut", "Gut", "Good", 30],
    ["condition", "Befriedigend", "Befriedigend", "Satisfactory", 40],
    ["fachbereich", "Paro", "Parodontologie", "Periodontology", 10],
    ["fachbereich", "Kons", "Konservierende Zahnheilkunde", "Conservative dentistry", 20],
    ["fachbereich", "Pro", "Prothetik", "Prosthodontics", 30],
    ["fachbereich", "KFO", "Kieferorthopädie", "Orthodontics", 40],
  ].forEach(([filterKey, value, labelDe, labelEn, sortOrder]) => seedOption({
    filter_key: filterKey,
    value,
    label: labelEn,
    label_de: labelDe,
    label_en: labelEn,
    active: true,
    sort_order: sortOrder,
    metadata: {},
  }));
}, (app) => {
  for (const name of ["shop_filter_options", "shop_filters"]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (error) {
      if (!error.message.includes("no rows in result set")) {
        throw error;
      }
    }
  }
})
