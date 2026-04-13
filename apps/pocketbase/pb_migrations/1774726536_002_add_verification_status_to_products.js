/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("products");

  const existing = collection.fields.getByName("verification_status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("verification_status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "verification_status",
    required: false,
    values: ["pending", "approved", "rejected"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("products");
  collection.fields.removeByName("verification_status");
  return app.save(collection);
})