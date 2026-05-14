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

  [
    "stripe_refund_id",
    "refund_status",
    "refund_processed_at",
    "refund_failure",
  ].forEach(ensureTextField);

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("returns");

  [
    "stripe_refund_id",
    "refund_status",
    "refund_processed_at",
    "refund_failure",
  ].forEach((fieldName) => {
    const field = collection.fields.getByName(fieldName);
    if (field) {
      collection.fields.removeByName(fieldName);
    }
  });

  return app.save(collection);
})
