/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  const existing = collection.fields.getByName("dhl_shipment_number");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("dhl_shipment_number"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "dhl_shipment_number",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");
  collection.fields.removeByName("dhl_shipment_number");
  return app.save(collection);
})