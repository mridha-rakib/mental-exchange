/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const ensureNumberField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) return false;

    collection.fields.add(new NumberField({
      name,
      required: false,
    }));
    return true;
  };

  for (const collectionName of ["products", "shop_products"]) {
    const collection = app.findCollectionByNameOrId(collectionName);
    let changed = false;

    for (const fieldName of ["stock_quantity", "weight_g", "length_mm", "width_mm", "height_mm"]) {
      changed = ensureNumberField(collection, fieldName) || changed;
    }

    if (changed) {
      app.save(collection);
    }
  }
}, (app) => {
  for (const collectionName of ["products", "shop_products"]) {
    const collection = app.findCollectionByNameOrId(collectionName);
    let changed = false;

    for (const fieldName of ["weight_g", "length_mm", "width_mm", "height_mm"]) {
      const existing = collection.fields.getByName(fieldName);
      if (existing) {
        collection.fields.removeByName(fieldName);
        changed = true;
      }
    }

    if (collectionName === "shop_products") {
      const stockQuantity = collection.fields.getByName("stock_quantity");
      if (stockQuantity) {
        collection.fields.removeByName("stock_quantity");
        changed = true;
      }
    }

    if (changed) {
      app.save(collection);
    }
  }
})
