/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const hasItems = (value) => Array.isArray(value) && value.length > 0;

  const packageRecords = app.findRecordsByFilter("learning_packages", "", "sort_order,title");
  for (const packageRecord of packageRecords) {
    const title = packageRecord.get("title") || "Learning package";
    const subtitle = packageRecord.get("subtitle") || title;

    if (!packageRecord.get("subtitle")) {
      packageRecord.set("subtitle", subtitle);
    }
    if (!packageRecord.get("hero_copy")) {
      packageRecord.set("hero_copy", packageRecord.get("description") || subtitle);
    }
    if (!packageRecord.get("pricing_copy")) {
      packageRecord.set("pricing_copy", subtitle);
    }
    if (!packageRecord.get("cta_text")) {
      packageRecord.set("cta_text", "Start subscription");
    }
    if (!hasItems(packageRecord.get("value_points"))) {
      packageRecord.set("value_points", [subtitle]);
    }
    if (!hasItems(packageRecord.get("faq"))) {
      packageRecord.set("faq", [
        {
          question: "What is included?",
          answer: subtitle,
        },
      ]);
    }

    app.save(packageRecord);
  }

  const modules = app.findCollectionByNameOrId("learning_modules");
  const lessons = app.findCollectionByNameOrId("learning_lessons");
  const packages = app.findCollectionByNameOrId("learning_packages");

  const setRequired = (collection, fieldName, required) => {
    const field = collection.fields.getByName(fieldName);
    if (field) {
      field.required = required;
    }
  };

  for (const fieldName of ["subtitle", "hero_copy", "pricing_copy", "cta_text", "value_points", "faq"]) {
    setRequired(packages, fieldName, true);
  }

  setRequired(modules, "position", true);
  setRequired(lessons, "position", true);

  app.save(packages);
  app.save(modules);
  app.save(lessons);
}, (app) => {
  const modules = app.findCollectionByNameOrId("learning_modules");
  const lessons = app.findCollectionByNameOrId("learning_lessons");
  const packages = app.findCollectionByNameOrId("learning_packages");

  const setRequired = (collection, fieldName, required) => {
    const field = collection.fields.getByName(fieldName);
    if (field) {
      field.required = required;
    }
  };

  for (const fieldName of ["subtitle", "hero_copy", "pricing_copy", "cta_text", "value_points", "faq"]) {
    setRequired(packages, fieldName, false);
  }

  setRequired(modules, "position", false);
  setRequired(lessons, "position", false);

  app.save(packages);
  app.save(modules);
  app.save(lessons);
})
