/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");

  if (!packages.fields.getByName("bundle_key")) {
    packages.fields.add(new TextField({
      name: "bundle_key",
      required: false,
    }));
  }

  if (!packages.fields.getByName("promo_badge")) {
    packages.fields.add(new TextField({
      name: "promo_badge",
      required: false,
    }));
  }

  if (!packages.fields.getByName("promo_text")) {
    packages.fields.add(new TextField({
      name: "promo_text",
      required: false,
    }));
  }

  if (!packages.fields.getByName("coupons_enabled")) {
    packages.fields.add(new BoolField({
      name: "coupons_enabled",
      required: false,
    }));
  }

  app.save(packages);
}, (app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");

  if (packages.fields.getByName("bundle_key")) {
    packages.fields.removeByName("bundle_key");
  }
  if (packages.fields.getByName("promo_badge")) {
    packages.fields.removeByName("promo_badge");
  }
  if (packages.fields.getByName("promo_text")) {
    packages.fields.removeByName("promo_text");
  }
  if (packages.fields.getByName("coupons_enabled")) {
    packages.fields.removeByName("coupons_enabled");
  }

  app.save(packages);
})
