/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.indexes.push("CREATE UNIQUE INDEX idx_users_seller_username ON users (seller_username) WHERE seller_username != ''");
  collection.indexes.push("CREATE UNIQUE INDEX idx_users_user_id ON users (user_id)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_users_seller_username"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_users_user_id"));
  return app.save(collection);
})