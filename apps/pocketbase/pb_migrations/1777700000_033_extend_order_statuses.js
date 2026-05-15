/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");
  const status = collection.fields.getByName("status");

  if (status) {
    status.values = [
      "pending",
      "paid",
      "waiting_admin_validation",
      "validated",
      "processing",
      "shipped",
      "dhl_delivered",
      "delivered",
      "waiting_payout_release",
      "payout_available",
      "paid_out",
      "completed",
      "cancelled",
      "refunded",
    ];
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");
  const status = collection.fields.getByName("status");

  if (status) {
    status.values = [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
    ];
  }

  return app.save(collection);
})
