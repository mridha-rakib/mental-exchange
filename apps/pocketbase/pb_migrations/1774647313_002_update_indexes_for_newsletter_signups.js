/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("newsletter_signups");
  collection.indexes.push("CREATE UNIQUE INDEX idx_newsletter_signups_email ON newsletter_signups (email)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("newsletter_signups");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_newsletter_signups_email"));
  return app.save(collection);
})