/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders");

  const ensureTextField = (name) => {
    const existing = orders.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") return false;
      orders.fields.removeByName(name);
    }

    orders.fields.add(new TextField({
      name,
      required: false,
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
    return true;
  };

  const ensureJsonField = (name) => {
    const existing = orders.fields.getByName(name);
    if (existing) {
      if (existing.type === "json") return false;
      orders.fields.removeByName(name);
    }

    orders.fields.add(new JSONField({
      name,
      required: false,
      maxSize: 0,
    }));
    return true;
  };

  let changed = false;
  [
    "dhl_tracking_status",
    "dhl_tracking_summary",
    "dhl_tracking_last_checked_at",
    "dhl_delivered_at",
    "dhl_delivery_confirmed_at",
  ].forEach((fieldName) => {
    changed = ensureTextField(fieldName) || changed;
  });

  changed = ensureJsonField("dhl_tracking_raw") || changed;

  if (changed) {
    app.save(orders);
  }
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  let changed = false;

  [
    "dhl_tracking_status",
    "dhl_tracking_summary",
    "dhl_tracking_last_checked_at",
    "dhl_delivered_at",
    "dhl_delivery_confirmed_at",
    "dhl_tracking_raw",
  ].forEach((fieldName) => {
    const existing = orders.fields.getByName(fieldName);
    if (existing) {
      orders.fields.removeByName(fieldName);
      changed = true;
    }
  });

  if (changed) {
    app.save(orders);
  }
})
