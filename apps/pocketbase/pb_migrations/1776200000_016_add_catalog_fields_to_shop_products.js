/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("shop_products");

  const ensureSelectField = (name, values, { required = false, maxSelect = 1 } = {}) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "select") {
        existing.values = values;
        existing.required = required;
        existing.maxSelect = maxSelect;
        return;
      }

      collection.fields.removeByName(name);
    }

    collection.fields.add(new SelectField({
      name,
      required,
      maxSelect,
      values,
    }));
  };

  const ensureJsonField = (name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "json") {
        return;
      }

      collection.fields.removeByName(name);
    }

    collection.fields.add(new JSONField({
      name,
      required: false,
      maxSize: 0,
    }));
  };

  ensureSelectField("product_type", ["Article", "Set", "Consumable"], { required: false });
  ensureJsonField("set_items");

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("shop_products");
  collection.fields.removeByName("product_type");
  collection.fields.removeByName("set_items");
  return app.save(collection);
})
