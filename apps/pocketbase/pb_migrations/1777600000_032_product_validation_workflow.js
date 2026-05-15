/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const ensureTextField = (collection, name, { max = 0 } = {}) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new TextField({
      name,
      required: false,
      max,
      min: 0,
      pattern: "",
    }));
    return true;
  };

  const ensureJsonField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "json") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new JSONField({
      name,
      required: false,
      maxSize: 0,
    }));
    return true;
  };

  const ensureBoolField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "bool") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new BoolField({
      name,
      required: false,
    }));
    return true;
  };

  const products = app.findCollectionByNameOrId("products");
  let productsChanged = false;
  [
    "verification_requested_at",
    "verification_fee_paid_at",
    "verification_payment_intent_id",
    "verification_checkout_session_id",
    "validation_requested_at",
    "validation_reviewed_at",
    "validation_admin_id",
    "validation_notes",
  ].forEach((fieldName) => {
    productsChanged = ensureTextField(products, fieldName) || productsChanged;
  });

  if (productsChanged) {
    productsChanged = ensureBoolField(products, "verification_fee_paid") || productsChanged;
  } else {
    productsChanged = ensureBoolField(products, "verification_fee_paid") || productsChanged;
  }

  if (productsChanged) {
    app.save(products);
  }

  const verifications = app.findCollectionByNameOrId("product_verifications");
  let verificationsChanged = false;
  verificationsChanged = ensureTextField(verifications, "admin_id") || verificationsChanged;
  verificationsChanged = ensureTextField(verifications, "reviewed_at") || verificationsChanged;
  verificationsChanged = ensureJsonField(verifications, "product_snapshot") || verificationsChanged;

  if (verificationsChanged) {
    app.save(verifications);
  }
}, (app) => {
  const removeFields = (collectionName, fieldNames) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    let changed = false;

    fieldNames.forEach((fieldName) => {
      const existing = collection.fields.getByName(fieldName);
      if (existing) {
        collection.fields.removeByName(fieldName);
        changed = true;
      }
    });

    if (changed) {
      app.save(collection);
    }
  };

  removeFields("products", [
    "verification_requested_at",
    "verification_fee_paid",
    "verification_fee_paid_at",
    "verification_payment_intent_id",
    "verification_checkout_session_id",
    "validation_requested_at",
    "validation_reviewed_at",
    "validation_admin_id",
    "validation_notes",
  ]);

  removeFields("product_verifications", [
    "admin_id",
    "reviewed_at",
    "product_snapshot",
  ]);
})
