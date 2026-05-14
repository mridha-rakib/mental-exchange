/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const jobs = app.findCollectionByNameOrId("dhl_label_jobs");
  const existingLockId = jobs.fields.getByName("lock_id");
  if (!existingLockId) {
    jobs.fields.add(new TextField({
      name: "lock_id",
      required: false,
      autogeneratePattern: "",
      max: 80,
      min: 0,
      pattern: "",
    }));
    app.save(jobs);
  }

  const collection = new Collection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_dhl_locks_id",
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
      { hidden: false, id: "text_dhl_locks_subject_key", name: "subject_key", required: true, system: false, type: "text", autogeneratePattern: "", max: 180, min: 1, pattern: "" },
      { hidden: false, id: "text_dhl_locks_idempotency", name: "idempotency_key", required: true, system: false, type: "text", autogeneratePattern: "", max: 240, min: 1, pattern: "" },
      { hidden: false, id: "text_dhl_locks_requested_by", name: "requested_by", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_dhl_locks_expires", name: "expires_at", required: true, system: false, type: "text", autogeneratePattern: "", max: 40, min: 1, pattern: "" },
      { hidden: false, id: "autodate_dhl_locks_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_dhl_locks_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "dhllabellocks1",
    indexes: [
      "CREATE UNIQUE INDEX idx_dhl_label_locks_subject_key ON dhl_label_locks (subject_key)",
      "CREATE INDEX idx_dhl_label_locks_expires ON dhl_label_locks (expires_at)",
    ],
    listRule: "@request.auth.is_admin = true",
    name: "dhl_label_locks",
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
  try {
    const collection = app.findCollectionByNameOrId("dhl_label_locks");
    app.delete(collection);
  } catch (error) {
    if (!error.message.includes("no rows in result set")) {
      throw error;
    }
  }

  const jobs = app.findCollectionByNameOrId("dhl_label_jobs");
  const existingLockId = jobs.fields.getByName("lock_id");
  if (existingLockId) {
    jobs.fields.removeByName("lock_id");
    app.save(jobs);
  }
})
