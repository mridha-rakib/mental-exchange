/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");

  for (const fieldName of ["seo_title", "seo_description", "og_title", "og_description", "og_image_url"]) {
    if (!packages.fields.getByName(fieldName)) {
      packages.fields.add(new TextField({
        name: fieldName,
        required: false,
      }));
    }
  }

  app.save(packages);
}, (app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");

  for (const fieldName of ["seo_title", "seo_description", "og_title", "og_description", "og_image_url"]) {
    if (packages.fields.getByName(fieldName)) {
      packages.fields.removeByName(fieldName);
    }
  }

  app.save(packages);
})
