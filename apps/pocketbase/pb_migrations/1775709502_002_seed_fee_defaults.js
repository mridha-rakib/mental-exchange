/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const records = app.findRecordsByFilter("admin_settings", "", "", 100, 0);

  for (const record of records) {
    if (!record.get("shipping_fee")) record.set("shipping_fee", 4.99);
    if (!record.get("service_fee")) record.set("service_fee", 1.99);
    if (!record.get("transaction_fee_percentage")) record.set("transaction_fee_percentage", 7);
    if (!record.get("verification_fee")) record.set("verification_fee", 15);
    app.save(record);
  }
}, (app) => {
  // Fee defaults are intentionally not reverted.
})
