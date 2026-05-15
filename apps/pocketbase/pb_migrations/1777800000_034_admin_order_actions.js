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

  const orders = app.findCollectionByNameOrId("orders");
  let ordersChanged = false;
  [
    "admin_validated_at",
    "admin_validated_by",
    "admin_paused_at",
    "admin_paused_by",
    "admin_pause_reason",
    "admin_cancelled_at",
    "admin_cancelled_by",
    "admin_cancel_reason",
    "admin_notes",
    "stripe_refund_id",
    "refund_status",
    "refund_processed_at",
    "refund_failure",
    "refunded_by",
  ].forEach((fieldName) => {
    ordersChanged = ensureTextField(orders, fieldName) || ordersChanged;
  });
  ordersChanged = ensureNumberField(orders, "refund_amount") || ordersChanged;

  if (ordersChanged) {
    app.save(orders);
  }

  const events = new Collection({
    "createRule": "@request.auth.is_admin = true",
    "deleteRule": "@request.auth.is_admin = true",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_order_event_id",
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
      { "hidden": false, "id": "text_order_event_order", "name": "order_id", "required": true, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_order_event_admin", "name": "admin_id", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_order_event_type", "name": "event_type", "required": true, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_order_event_from", "name": "from_status", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_order_event_to", "name": "to_status", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_order_event_note", "name": "note", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "json_order_event_meta", "name": "metadata", "presentable": false, "required": false, "system": false, "type": "json", "maxSize": 0 },
      { "hidden": false, "id": "autodate_order_event_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_order_event_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_order_status_events",
    "indexes": [
      "CREATE INDEX idx_order_status_events_order ON order_status_events (order_id, created)"
    ],
    "listRule": "@request.auth.is_admin = true",
    "name": "order_status_events",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.is_admin = true",
    "viewRule": "@request.auth.is_admin = true"
  });

  try {
    app.save(events);
  } catch (error) {
    if (!String(error.message || "").includes("Collection name must be unique")) {
      throw error;
    }
  }
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  let changed = false;
  [
    "admin_validated_at",
    "admin_validated_by",
    "admin_paused_at",
    "admin_paused_by",
    "admin_pause_reason",
    "admin_cancelled_at",
    "admin_cancelled_by",
    "admin_cancel_reason",
    "admin_notes",
    "stripe_refund_id",
    "refund_status",
    "refund_amount",
    "refund_processed_at",
    "refund_failure",
    "refunded_by",
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

  try {
    const events = app.findCollectionByNameOrId("order_status_events");
    app.delete(events);
  } catch (error) {
    if (!String(error.message || "").includes("no rows in result set")) {
      throw error;
    }
  }
})
