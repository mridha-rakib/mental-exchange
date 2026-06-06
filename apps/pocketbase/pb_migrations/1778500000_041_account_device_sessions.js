/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    createRule: null,
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_device_sessions_id",
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
      { hidden: false, id: "text_device_sessions_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "" },
      { hidden: false, id: "text_device_sessions_device", name: "device_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 120, min: 1, pattern: "" },
      { hidden: false, id: "text_device_sessions_label", name: "device_label", required: false, system: false, type: "text", autogeneratePattern: "", max: 180, min: 0, pattern: "" },
      { hidden: false, id: "text_device_sessions_user_agent", name: "user_agent", required: false, system: false, type: "text", autogeneratePattern: "", max: 500, min: 0, pattern: "" },
      { hidden: false, id: "text_device_sessions_ip", name: "ip_address", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_device_sessions_last_seen", name: "last_seen_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_device_sessions_expires", name: "expires_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_device_sessions_revoked", name: "revoked_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "bool_device_sessions_active", name: "is_active", required: false, system: false, type: "bool" },
      { hidden: false, id: "autodate_device_sessions_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_device_sessions_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "devicesessions1",
    indexes: [
      "CREATE UNIQUE INDEX idx_device_sessions_user_device ON account_device_sessions (user_id, device_id)",
      "CREATE INDEX idx_device_sessions_user_active ON account_device_sessions (user_id, is_active, expires_at)",
    ],
    listRule: "user_id = @request.auth.id || @request.auth.is_admin = true",
    name: "account_device_sessions",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "user_id = @request.auth.id || @request.auth.is_admin = true",
  });

  try {
    app.save(collection);
  } catch (error) {
    if (error.message.includes("Collection name must be unique")) {
      console.log("Collection account_device_sessions already exists, skipping");
      return;
    }

    throw error;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("account_device_sessions");
    app.delete(collection);
  } catch (error) {
    if (error.message.includes("no rows in result set")) {
      console.log("Collection account_device_sessions not found, skipping rollback");
      return;
    }

    throw error;
  }
});
