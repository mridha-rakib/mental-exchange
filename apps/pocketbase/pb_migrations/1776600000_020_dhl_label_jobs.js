/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const ensureTextField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") return;
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
  };

  const addLabelStateFields = (collectionName) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    [
      "label_failure_type",
      "label_last_attempt_at",
      "label_retry_after",
      "label_idempotency_key",
    ].forEach((fieldName) => ensureTextField(collection, fieldName));
    app.save(collection);
  };

  addLabelStateFields("orders");
  addLabelStateFields("returns");

  const collection = new Collection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_dhl_jobs_id",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text",
      },
      { hidden: false, id: "text_dhl_jobs_subject_key", name: "subject_key", required: true, system: false, type: "text", autogeneratePattern: "", max: 180, min: 1, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_subject_type", name: "subject_type", required: true, system: false, type: "text", autogeneratePattern: "", max: 40, min: 1, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_subject_id", name: "subject_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_idempotency", name: "idempotency_key", required: true, system: false, type: "text", autogeneratePattern: "", max: 240, min: 1, pattern: "" },
      {
        hidden: false,
        id: "select_dhl_jobs_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["processing", "generated", "failed", "unknown", "cancelled"],
      },
      { hidden: false, id: "number_dhl_jobs_attempts", name: "attempts", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_dhl_jobs_requested_by", name: "requested_by", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_locked_until", name: "locked_until", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_tracking", name: "tracking_number", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_shipment", name: "shipment_number", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_product", name: "product_used", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_country", name: "destination_country", required: false, system: false, type: "text", autogeneratePattern: "", max: 12, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_generated_at", name: "generated_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_completed_at", name: "completed_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_failed_at", name: "failed_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_last_attempt", name: "last_attempt_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_failure_type", name: "failure_type", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_jobs_error", name: "last_error", required: false, system: false, type: "text", autogeneratePattern: "", max: 2000, min: 0, pattern: "" },
      { hidden: false, id: "bool_dhl_jobs_label_saved", name: "label_saved", required: false, system: false, type: "bool" },
      { hidden: false, id: "json_dhl_jobs_metadata", name: "metadata", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_dhl_jobs_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_dhl_jobs_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "dhllabeljobs001",
    indexes: [
      "CREATE UNIQUE INDEX idx_dhl_label_jobs_subject_key ON dhl_label_jobs (subject_key)",
      "CREATE INDEX idx_dhl_label_jobs_status_updated ON dhl_label_jobs (status, updated)",
      "CREATE INDEX idx_dhl_label_jobs_idempotency ON dhl_label_jobs (idempotency_key)",
    ],
    listRule: "@request.auth.is_admin = true",
    name: "dhl_label_jobs",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true",
  });

  try {
    app.save(collection);
  } catch (error) {
    if (!error.message.includes("Collection name must be unique")) {
      throw error;
    }
  }
}, (app) => {
  const removeLabelStateFields = (collectionName) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    [
      "label_failure_type",
      "label_last_attempt_at",
      "label_retry_after",
      "label_idempotency_key",
    ].forEach((fieldName) => {
      const existing = collection.fields.getByName(fieldName);
      if (existing) collection.fields.removeByName(fieldName);
    });
    app.save(collection);
  };

  removeLabelStateFields("orders");
  removeLabelStateFields("returns");

  try {
    const collection = app.findCollectionByNameOrId("dhl_label_jobs");
    app.delete(collection);
  } catch (error) {
    if (!error.message.includes("no rows in result set")) {
      throw error;
    }
  }
})
