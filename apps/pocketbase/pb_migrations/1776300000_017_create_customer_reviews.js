/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    createRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_customer_review_id",
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
      { hidden: false, id: "text_customer_review_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_customer_review_order", name: "order_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_customer_review_product", name: "product_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_customer_review_product_name", name: "product_name", required: false, system: false, type: "text", autogeneratePattern: "", max: 180, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_customer_review_product_type",
        name: "product_type",
        required: false,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["marketplace", "shop"],
      },
      { hidden: false, id: "number_customer_review_rating", name: "rating", required: true, system: false, type: "number", max: 5, min: 1, onlyInt: true },
      { hidden: false, id: "text_customer_review_body", name: "body", required: true, system: false, type: "text", autogeneratePattern: "", max: 1200, min: 10, pattern: "" },
      { hidden: false, id: "text_customer_review_display_name", name: "display_name", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "" },
      {
        hidden: false,
        id: "select_customer_review_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["pending", "approved", "rejected"],
      },
      { hidden: false, id: "bool_customer_review_featured", name: "is_featured", required: false, system: false, type: "bool" },
      { hidden: false, id: "text_customer_review_admin_notes", name: "admin_notes", required: false, system: false, type: "text", autogeneratePattern: "", max: 1200, min: 0, pattern: "" },
      { hidden: false, id: "autodate_customer_review_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_customer_review_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "custrev00000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_customer_reviews_user_order ON customer_reviews (user_id, order_id)",
      "CREATE INDEX idx_customer_reviews_status_featured ON customer_reviews (status, is_featured, created)",
    ],
    listRule: "status = 'approved' || user_id = @request.auth.id || @request.auth.is_admin = true",
    name: "customer_reviews",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "status = 'approved' || user_id = @request.auth.id || @request.auth.is_admin = true",
  });

  try {
    app.save(collection);
  } catch (error) {
    if (error.message.includes("Collection name must be unique")) {
      console.log("Collection customer_reviews already exists, skipping");
      return;
    }

    throw error;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("customer_reviews");
    app.delete(collection);
  } catch (error) {
    if (error.message.includes("no rows in result set")) {
      console.log("Collection customer_reviews not found, skipping rollback");
      return;
    }

    throw error;
  }
})
