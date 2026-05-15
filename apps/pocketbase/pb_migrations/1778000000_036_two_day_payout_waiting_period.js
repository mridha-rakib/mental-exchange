/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const ensureTextField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new TextField({
      name,
      required: false,
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
    return true;
  };

  const orders = app.findCollectionByNameOrId("orders");
  let ordersChanged = false;
  [
    "delivered_at",
    "payout_release_at",
    "payout_released_at",
    "payout_release_blocked_reason",
    "delivery_status_source",
  ].forEach((fieldName) => {
    ordersChanged = ensureTextField(orders, fieldName) || ordersChanged;
  });
  if (ordersChanged) {
    app.save(orders);
  }

  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const status = earnings.fields.getByName("status");
  if (status) {
    status.values = [
      "pending",
      "waiting_payout_release",
      "available",
      "confirmed",
      "blocked",
    ];
  }

  let earningsChanged = Boolean(status);
  [
    "available_at",
    "released_at",
    "payout_release_blocked_reason",
  ].forEach((fieldName) => {
    earningsChanged = ensureTextField(earnings, fieldName) || earningsChanged;
  });

  if (earningsChanged) {
    app.save(earnings);
  }
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  let ordersChanged = false;
  [
    "delivered_at",
    "payout_release_at",
    "payout_released_at",
    "payout_release_blocked_reason",
    "delivery_status_source",
  ].forEach((fieldName) => {
    const existing = orders.fields.getByName(fieldName);
    if (existing) {
      orders.fields.removeByName(fieldName);
      ordersChanged = true;
    }
  });
  if (ordersChanged) {
    app.save(orders);
  }

  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const status = earnings.fields.getByName("status");
  if (status) {
    status.values = [
      "pending",
      "confirmed",
    ];
  }

  let earningsChanged = Boolean(status);
  [
    "available_at",
    "released_at",
    "payout_release_blocked_reason",
  ].forEach((fieldName) => {
    const existing = earnings.fields.getByName(fieldName);
    if (existing) {
      earnings.fields.removeByName(fieldName);
      earningsChanged = true;
    }
  });

  if (earningsChanged) {
    app.save(earnings);
  }
})
