/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const existingConflictId = earnings.fields.getByName("payout_conflict_id");
  if (!existingConflictId) {
    earnings.fields.add(new TextField({
      name: "payout_conflict_id",
      required: false,
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
    app.save(earnings);
  }

  const conflicts = new Collection({
    "createRule": "@request.auth.is_admin = true",
    "deleteRule": "@request.auth.is_admin = true",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_payout_conflict_id",
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
      { "hidden": false, "id": "text_payout_conflict_seller", "name": "seller_id", "required": true, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_conflict_order", "name": "order_id", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_conflict_earning", "name": "earning_id", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_conflict_request", "name": "payout_request_id", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "select_payout_conflict_status", "name": "status", "required": false, "system": false, "type": "select", "maxSelect": 1, "values": ["open", "resolved", "dismissed"] },
      { "hidden": false, "id": "text_payout_conflict_reason", "name": "reason", "required": true, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_conflict_notes", "name": "admin_notes", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "number_payout_conflict_amount", "name": "blocked_amount", "required": false, "system": false, "type": "number", "max": null, "min": null, "onlyInt": false },
      { "hidden": false, "id": "text_payout_conflict_created_by", "name": "created_by", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_conflict_resolved_by", "name": "resolved_by", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_conflict_resolved_at", "name": "resolved_at", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "json_payout_conflict_meta", "name": "metadata", "presentable": false, "required": false, "system": false, "type": "json", "maxSize": 0 },
      { "hidden": false, "id": "autodate_payout_conflict_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_payout_conflict_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_seller_payout_conflicts",
    "indexes": [
      "CREATE INDEX idx_seller_payout_conflicts_status ON seller_payout_conflicts (status, created)",
      "CREATE INDEX idx_seller_payout_conflicts_seller ON seller_payout_conflicts (seller_id, status)"
    ],
    "listRule": "@request.auth.is_admin = true",
    "name": "seller_payout_conflicts",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.is_admin = true",
    "viewRule": "@request.auth.is_admin = true"
  });

  try {
    app.save(conflicts);
  } catch (error) {
    if (!String(error.message || "").includes("Collection name must be unique")) {
      throw error;
    }
  }
}, (app) => {
  try {
    const conflicts = app.findCollectionByNameOrId("seller_payout_conflicts");
    app.delete(conflicts);
  } catch (error) {
    if (!String(error.message || "").includes("no rows in result set")) {
      throw error;
    }
  }

  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const conflictId = earnings.fields.getByName("payout_conflict_id");
  if (conflictId) {
    earnings.fields.removeByName("payout_conflict_id");
    app.save(earnings);
  }
})
