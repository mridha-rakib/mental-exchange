/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const existingPayoutRequestId = earnings.fields.getByName("payout_request_id");
  if (!existingPayoutRequestId) {
    earnings.fields.add(new TextField({
      name: "payout_request_id",
      required: false,
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
    app.save(earnings);
  }

  const requests = new Collection({
    "createRule": "seller_id = @request.auth.id || @request.auth.is_admin = true",
    "deleteRule": "@request.auth.is_admin = true",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_payout_request_id",
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
      { "hidden": false, "id": "text_payout_request_seller", "name": "seller_id", "required": true, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "number_payout_request_amount", "name": "amount", "required": true, "system": false, "type": "number", "max": null, "min": 0, "onlyInt": false },
      { "hidden": false, "id": "text_payout_request_currency", "name": "currency", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 8, "min": 0, "pattern": "" },
      { "hidden": false, "id": "select_payout_request_status", "name": "status", "required": false, "system": false, "type": "select", "maxSelect": 1, "values": ["requested", "reviewing", "approved", "rejected", "cancelled", "processing", "paid", "failed"] },
      { "hidden": false, "id": "text_payout_request_seller_notes", "name": "seller_notes", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_admin_notes", "name": "admin_notes", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_requested", "name": "requested_at", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_reviewed", "name": "reviewed_at", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_reviewed_by", "name": "reviewed_by", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_paid", "name": "paid_at", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_stripe_transfer", "name": "stripe_transfer_id", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_stripe_payout", "name": "stripe_payout_id", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "text_payout_request_failure", "name": "failure_reason", "required": false, "system": false, "type": "text", "autogeneratePattern": "", "max": 0, "min": 0, "pattern": "" },
      { "hidden": false, "id": "json_payout_request_snapshot", "name": "balance_snapshot", "presentable": false, "required": false, "system": false, "type": "json", "maxSize": 0 },
      { "hidden": false, "id": "autodate_payout_request_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_payout_request_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_seller_payout_requests",
    "indexes": [
      "CREATE INDEX idx_seller_payout_requests_seller_status ON seller_payout_requests (seller_id, status, created)"
    ],
    "listRule": "seller_id = @request.auth.id || @request.auth.is_admin = true",
    "name": "seller_payout_requests",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.is_admin = true",
    "viewRule": "seller_id = @request.auth.id || @request.auth.is_admin = true"
  });

  try {
    app.save(requests);
  } catch (error) {
    if (!String(error.message || "").includes("Collection name must be unique")) {
      throw error;
    }
  }
}, (app) => {
  try {
    const requests = app.findCollectionByNameOrId("seller_payout_requests");
    app.delete(requests);
  } catch (error) {
    if (!String(error.message || "").includes("no rows in result set")) {
      throw error;
    }
  }

  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const payoutRequestId = earnings.fields.getByName("payout_request_id");
  if (payoutRequestId) {
    earnings.fields.removeByName("payout_request_id");
    app.save(earnings);
  }
})
