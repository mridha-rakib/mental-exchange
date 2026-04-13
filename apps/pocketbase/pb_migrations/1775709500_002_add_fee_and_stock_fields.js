/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const adminSettings = app.findCollectionByNameOrId("admin_settings");
  const verificationFee = adminSettings.fields.getByName("verification_fee");

  if (!verificationFee) {
    adminSettings.fields.add(new NumberField({
      name: "verification_fee",
      required: false
    }));
    app.save(adminSettings);
  }

  const products = app.findCollectionByNameOrId("products");
  const stockQuantity = products.fields.getByName("stock_quantity");

  if (!stockQuantity) {
    products.fields.add(new NumberField({
      name: "stock_quantity",
      required: false
    }));
    app.save(products);
  }
}, (app) => {
  const adminSettings = app.findCollectionByNameOrId("admin_settings");
  const verificationFee = adminSettings.fields.getByName("verification_fee");
  if (verificationFee) {
    adminSettings.fields.removeByName("verification_fee");
    app.save(adminSettings);
  }

  const products = app.findCollectionByNameOrId("products");
  const stockQuantity = products.fields.getByName("stock_quantity");
  if (stockQuantity) {
    products.fields.removeByName("stock_quantity");
    app.save(products);
  }
})
