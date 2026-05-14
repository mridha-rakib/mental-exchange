/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_evt_id",
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
      { hidden: false, id: "text_learning_evt_user", name: "user_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_evt_package", name: "package_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_evt_subscription", name: "subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_evt_stripe_sub", name: "stripe_subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_evt_type", name: "event_type", required: true, system: false, type: "text", autogeneratePattern: "", max: 120, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_evt_source", name: "source", required: true, system: false, type: "text", autogeneratePattern: "", max: 60, min: 0, pattern: "" },
      { hidden: false, id: "json_learning_evt_payload", name: "payload", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_learning_evt_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_evt_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnevt000000001",
    indexes: [
      "CREATE INDEX idx_learning_events_subscription ON learning_subscription_events (subscription_id, created)",
      "CREATE INDEX idx_learning_events_stripe_subscription ON learning_subscription_events (stripe_subscription_id, created)",
    ],
    listRule: "@request.auth.is_admin = true",
    name: "learning_subscription_events",
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
    const collection = app.findCollectionByNameOrId("learning_subscription_events");
    app.delete(collection);
  } catch (error) {
    if (!error.message.includes("no rows in result set")) {
      throw error;
    }
  }
})
