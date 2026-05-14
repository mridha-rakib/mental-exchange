/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const saveCollection = (config) => {
    const collection = new Collection(config);

    try {
      app.save(collection);
    } catch (error) {
      if (error.message.includes("Collection name must be unique")) {
        console.log(`Collection ${config.name} already exists, skipping`);
        return;
      }

      throw error;
    }
  };

  saveCollection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_inv_id",
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
      { hidden: false, id: "text_learning_inv_user", name: "user_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_package", name: "package_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_subscription", name: "subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_stripe_sub", name: "stripe_subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_stripe_inv", name: "stripe_invoice_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_inv_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["draft", "open", "paid", "uncollectible", "void", "deleted"],
      },
      { hidden: false, id: "number_learning_inv_paid", name: "amount_paid", required: false, system: false, type: "number", max: null, min: 0, onlyInt: false },
      { hidden: false, id: "number_learning_inv_due", name: "amount_due", required: false, system: false, type: "number", max: null, min: 0, onlyInt: false },
      { hidden: false, id: "text_learning_inv_currency", name: "currency", required: false, system: false, type: "text", autogeneratePattern: "", max: 10, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_number", name: "invoice_number", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_hosted", name: "hosted_invoice_url", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_pdf", name: "invoice_pdf", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_reason", name: "billing_reason", required: false, system: false, type: "text", autogeneratePattern: "", max: 120, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_created_at", name: "created_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_period_start", name: "period_start", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_inv_period_end", name: "period_end", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "json_learning_inv_payload", name: "payload", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_learning_inv_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_inv_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrninv000000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_learning_invoices_stripe_invoice ON learning_invoices (stripe_invoice_id)",
      "CREATE INDEX idx_learning_invoices_subscription ON learning_invoices (subscription_id, created_at)",
      "CREATE INDEX idx_learning_invoices_stripe_subscription ON learning_invoices (stripe_subscription_id, created_at)",
    ],
    listRule: "@request.auth.is_admin = true || @request.auth.id = user_id",
    name: "learning_invoices",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true || @request.auth.id = user_id",
  });

  saveCollection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_coupon_id",
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
      { hidden: false, id: "text_learning_coupon_code", name: "code", required: true, system: false, type: "text", autogeneratePattern: "", max: 80, min: 1, pattern: "^[A-Za-z0-9_-]+$" },
      { hidden: false, id: "text_learning_coupon_title", name: "title", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_coupon_desc", name: "description", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_coupon_package", name: "package_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_coupon_bundle", name: "bundle_key", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_coupon_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["draft", "active", "archived"],
      },
      {
        hidden: false,
        id: "select_learning_coupon_type",
        name: "discount_type",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["percent", "fixed_amount"],
      },
      { hidden: false, id: "number_learning_coupon_percent", name: "percent_off", required: false, system: false, type: "number", max: 100, min: 0, onlyInt: false },
      { hidden: false, id: "number_learning_coupon_amount", name: "amount_off", required: false, system: false, type: "number", max: null, min: 0, onlyInt: false },
      { hidden: false, id: "text_learning_coupon_currency", name: "currency", required: false, system: false, type: "text", autogeneratePattern: "", max: 10, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_coupon_duration",
        name: "duration",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["once", "repeating", "forever"],
      },
      { hidden: false, id: "number_learning_coupon_months", name: "duration_in_months", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_learning_coupon_starts", name: "starts_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_coupon_expires", name: "expires_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "number_learning_coupon_max", name: "max_redemptions", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_learning_coupon_count", name: "redemption_count", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_learning_coupon_stripe", name: "stripe_coupon_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_coupon_promo_id", name: "stripe_promotion_code_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_coupon_promo_text", name: "promotion_text", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "autodate_learning_coupon_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_coupon_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrncoupon000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_learning_coupons_code ON learning_coupons (code)",
      "CREATE INDEX idx_learning_coupons_package_status ON learning_coupons (package_id, status)",
      "CREATE INDEX idx_learning_coupons_bundle_status ON learning_coupons (bundle_key, status)",
    ],
    listRule: "@request.auth.is_admin = true",
    name: "learning_coupons",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true",
  });

  saveCollection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_red_id",
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
      { hidden: false, id: "text_learning_red_coupon", name: "coupon_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_red_user", name: "user_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_red_package", name: "package_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_red_subscription", name: "subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_red_session", name: "checkout_session_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_red_stripe_coupon", name: "stripe_coupon_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_red_stripe_promo", name: "stripe_promotion_code_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_red_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["applied", "void"],
      },
      { hidden: false, id: "text_learning_red_type", name: "discount_type", required: false, system: false, type: "text", autogeneratePattern: "", max: 50, min: 0, pattern: "" },
      { hidden: false, id: "number_learning_red_percent", name: "percent_off", required: false, system: false, type: "number", max: 100, min: 0, onlyInt: false },
      { hidden: false, id: "number_learning_red_amount", name: "amount_off", required: false, system: false, type: "number", max: null, min: 0, onlyInt: false },
      { hidden: false, id: "text_learning_red_currency", name: "currency", required: false, system: false, type: "text", autogeneratePattern: "", max: 10, min: 0, pattern: "" },
      { hidden: false, id: "autodate_learning_red_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_red_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnred000000001",
    indexes: [
      "CREATE INDEX idx_learning_coupon_redemptions_coupon ON learning_coupon_redemptions (coupon_id, created)",
      "CREATE INDEX idx_learning_coupon_redemptions_user ON learning_coupon_redemptions (user_id, created)",
      "CREATE UNIQUE INDEX idx_learning_coupon_redemptions_session ON learning_coupon_redemptions (checkout_session_id) WHERE checkout_session_id != ''",
    ],
    listRule: "@request.auth.is_admin = true",
    name: "learning_coupon_redemptions",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true",
  });
}, (app) => {
  for (const collectionName of ["learning_coupon_redemptions", "learning_coupons", "learning_invoices"]) {
    try {
      const collection = app.findCollectionByNameOrId(collectionName);
      app.delete(collection);
    } catch (error) {
      if (!error.message.includes("no rows in result set")) {
        throw error;
      }
    }
  }
})
