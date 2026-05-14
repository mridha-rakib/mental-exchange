/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("newsletter_signups");

  const ensureTextField = (name) => {
    if (collection.fields.getByName(name)) {
      return;
    }

    collection.fields.add(new TextField({
      name,
      required: false,
    }));
  };

  ensureTextField("subscribed_at");
  ensureTextField("status");
  ensureTextField("source");
  ensureTextField("checkout_session_id");
  ensureTextField("payment_intent_id");

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("newsletter_signups");

  for (const fieldName of ["subscribed_at", "status", "source", "checkout_session_id", "payment_intent_id"]) {
    if (collection.fields.getByName(fieldName)) {
      collection.fields.removeByName(fieldName);
    }
  }

  app.save(collection);
})
