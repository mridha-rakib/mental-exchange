/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("products");
  const field = collection.fields.getByName("status");
  field.values = ["draft", "active", "pending_verification", "rejected", "sold"];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("products");
  const field = collection.fields.getByName("status");
  field.values = ["active", "pending_verification", "rejected", "sold"];
  return app.save(collection);
})