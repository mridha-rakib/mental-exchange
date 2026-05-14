/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

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
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
  };

  [
    "dhl_label_pdf",
    "dhl_label_url",
    "label_status",
    "label_error",
    "label_generated_at",
    "destination_country",
    "dhl_product_used",
    "dhl_shipment_number",
  ].forEach(ensureTextField);

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");

  [
    "dhl_label_url",
    "label_status",
    "label_error",
    "label_generated_at",
    "destination_country",
    "dhl_product_used",
  ].forEach((name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      collection.fields.removeByName(name);
    }
  });

  return app.save(collection);
})
