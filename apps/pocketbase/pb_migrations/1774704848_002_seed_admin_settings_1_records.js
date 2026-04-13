/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("admin_settings");

  const record0 = new Record(collection);
    record0.set("shipping_fee", 4.99);
    record0.set("service_fee", 1.99);
    record0.set("transaction_fee_percentage", 7);
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})