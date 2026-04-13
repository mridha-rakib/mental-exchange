/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("products");
  collection.listRule = "status = 'active' || verification_status = 'approved' || seller_id = @request.auth.id || @request.auth.is_admin = true";
  collection.viewRule = "status = 'active' || verification_status = 'approved' || seller_id = @request.auth.id || @request.auth.is_admin = true";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("products");
  collection.listRule = "status = 'active' || @request.auth.id != ''";
  collection.viewRule = "status = 'active' || @request.auth.id != ''";
  return app.save(collection);
})