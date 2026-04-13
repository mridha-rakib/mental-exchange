/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  const productType = collection.fields.getByName("product_type");
  if (!productType) {
    collection.fields.add(new SelectField({
      name: "product_type",
      maxSelect: 1,
      values: ["marketplace", "shop"]
    }));
  }

  const status = collection.fields.getByName("status");
  if (status && status.values.indexOf("cancelled") === -1) {
    status.values = ["pending", "paid", "shipped", "delivered", "cancelled"];
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");

  const productType = collection.fields.getByName("product_type");
  if (productType) {
    collection.fields.removeByName("product_type");
  }

  const status = collection.fields.getByName("status");
  if (status) {
    status.values = ["pending", "paid", "shipped", "delivered"];
  }

  return app.save(collection);
})
