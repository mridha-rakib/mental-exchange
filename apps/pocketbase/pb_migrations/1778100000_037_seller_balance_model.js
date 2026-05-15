/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const ensureTextField = (collection, name, { required = false } = {}) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new TextField({
      name,
      required,
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
    return true;
  };

  const ensureNumberField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "number") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new NumberField({
      name,
      required: false,
      max: null,
      min: null,
      onlyInt: false,
    }));
    return true;
  };

  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const earningStatus = earnings.fields.getByName("status");
  if (earningStatus) {
    earningStatus.values = [
      "pending",
      "waiting_payout_release",
      "available",
      "confirmed",
      "blocked",
      "paid_out",
    ];
    app.save(earnings);
  }

  const balances = new Collection({
    "createRule": "@request.auth.is_admin = true",
    "deleteRule": "@request.auth.is_admin = true",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_seller_balance_id",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      { "hidden": false, "id": "text_seller_balance_seller", "name": "seller_id", "required": true, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_seller_balance_currency", "name": "currency", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 8, "min": 0, "pattern": "" },
      { "hidden": false, "id": "num_seller_balance_pending", "name": "pending_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_waiting", "name": "waiting_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_available", "name": "available_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_blocked", "name": "blocked_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_paidout", "name": "paid_out_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_gross", "name": "lifetime_gross_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_fee", "name": "lifetime_fee_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_net", "name": "lifetime_net_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "num_seller_balance_pending_count", "name": "pending_count", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": true },
      { "hidden": false, "id": "num_seller_balance_waiting_count", "name": "waiting_count", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": true },
      { "hidden": false, "id": "num_seller_balance_available_count", "name": "available_count", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": true },
      { "hidden": false, "id": "num_seller_balance_blocked_count", "name": "blocked_count", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": true },
      { "hidden": false, "id": "num_seller_balance_paidout_count", "name": "paid_out_count", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": true },
      { "hidden": false, "id": "num_seller_balance_order_count", "name": "order_count", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": true },
      { "hidden": false, "id": "text_seller_balance_synced", "name": "last_synced_at", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "autodate_seller_balance_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_seller_balance_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_seller_balances",
    "indexes": [
      "CREATE UNIQUE INDEX idx_seller_balances_seller ON seller_balances (seller_id)"
    ],
    "listRule": "seller_id = @request.auth.id || @request.auth.is_admin = true",
    "name": "seller_balances",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.is_admin = true",
    "viewRule": "seller_id = @request.auth.id || @request.auth.is_admin = true"
  });

  try {
    app.save(balances);
  } catch (error) {
    if (!String(error.message || "").includes("Collection name must be unique")) {
      throw error;
    }

    const existing = app.findCollectionByNameOrId("seller_balances");
    let changed = false;
    changed = ensureTextField(existing, "seller_id", { required: true }) || changed;
    changed = ensureTextField(existing, "currency") || changed;
    [
      "pending_amount",
      "waiting_amount",
      "available_amount",
      "blocked_amount",
      "paid_out_amount",
      "lifetime_gross_amount",
      "lifetime_fee_amount",
      "lifetime_net_amount",
      "pending_count",
      "waiting_count",
      "available_count",
      "blocked_count",
      "paid_out_count",
      "order_count",
    ].forEach((fieldName) => {
      changed = ensureNumberField(existing, fieldName) || changed;
    });
    changed = ensureTextField(existing, "last_synced_at") || changed;
    if (changed) {
      app.save(existing);
    }
  }
}, (app) => {
  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const earningStatus = earnings.fields.getByName("status");
  if (earningStatus) {
    earningStatus.values = [
      "pending",
      "waiting_payout_release",
      "available",
      "confirmed",
      "blocked",
    ];
    app.save(earnings);
  }

  try {
    const balances = app.findCollectionByNameOrId("seller_balances");
    app.delete(balances);
  } catch (error) {
    if (!String(error.message || "").includes("no rows in result set")) {
      throw error;
    }
  }
})
