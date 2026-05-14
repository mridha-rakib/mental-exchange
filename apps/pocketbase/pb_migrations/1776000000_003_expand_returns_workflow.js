/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("returns");

  const ensureTextField = (name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") {
        return;
      }
      collection.fields.removeByName(name);
    }

    collection.fields.add(new TextField({
      name,
      required: false,
    }));
  };

  const ensureSelectField = (name, values) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "select") {
        existing.maxSelect = 1;
        existing.values = values;
        return;
      }
      collection.fields.removeByName(name);
    }

    collection.fields.add(new SelectField({
      name,
      maxSelect: 1,
      values,
    }));
  };

  ensureTextField("details");
  ensureTextField("admin_notes");
  ensureTextField("dhl_tracking_number");
  ensureTextField("dhl_label_pdf");
  ensureTextField("label_generated_at");
  ensureTextField("claim_window_expires_at");

  ensureSelectField("product_type", ["marketplace", "shop"]);
  ensureSelectField("return_type", ["marketplace_claim", "marketplace_form", "shop_return"]);

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("returns");

  [
    "details",
    "admin_notes",
    "dhl_tracking_number",
    "dhl_label_pdf",
    "label_generated_at",
    "claim_window_expires_at",
    "product_type",
    "return_type",
  ].forEach((fieldName) => {
    const field = collection.fields.getByName(fieldName);
    if (field) {
      collection.fields.removeByName(fieldName);
    }
  });

  return app.save(collection);
})
