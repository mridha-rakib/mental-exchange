/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");

  if (!packages.fields.getByName("hero_copy")) {
    packages.fields.add(new TextField({
      name: "hero_copy",
      required: false,
    }));
  }

  if (!packages.fields.getByName("pricing_copy")) {
    packages.fields.add(new TextField({
      name: "pricing_copy",
      required: false,
    }));
  }

  if (!packages.fields.getByName("cta_text")) {
    packages.fields.add(new TextField({
      name: "cta_text",
      required: false,
    }));
  }

  app.save(packages);
}, (app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");

  if (packages.fields.getByName("hero_copy")) {
    packages.fields.removeByName("hero_copy");
  }
  if (packages.fields.getByName("pricing_copy")) {
    packages.fields.removeByName("pricing_copy");
  }
  if (packages.fields.getByName("cta_text")) {
    packages.fields.removeByName("cta_text");
  }

  app.save(packages);
})
