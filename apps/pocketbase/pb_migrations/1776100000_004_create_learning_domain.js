/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const saveCollection = (config) => {
    const collection = new Collection(config);

    try {
      app.save(collection);
    } catch (error) {
      if (error.message.includes('Collection name must be unique')) {
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
        id: "text_learning_pkg_id",
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
      { hidden: false, id: "text_learning_pkg_slug", name: "slug", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_title", name: "title", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_subtitle", name: "subtitle", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_desc", name: "description", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_target", name: "target_audience", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_hero", name: "hero_image_url", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_thumb", name: "thumbnail_url", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "number_learning_pkg_price", name: "price_amount", required: true, system: false, type: "number", max: null, min: 0, onlyInt: false },
      { hidden: false, id: "text_learning_pkg_currency", name: "currency", required: true, system: false, type: "text", autogeneratePattern: "", max: 10, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_pkg_interval",
        name: "billing_interval",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["month", "year"],
      },
      { hidden: false, id: "number_learning_pkg_interval_count", name: "billing_interval_count", required: false, system: false, type: "number", max: null, min: 1, onlyInt: true },
      {
        hidden: false,
        id: "select_learning_pkg_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["draft", "published", "archived"],
      },
      { hidden: false, id: "text_learning_pkg_stripe_product", name: "stripe_product_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_pkg_stripe_price", name: "stripe_price_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "number_learning_pkg_sort", name: "sort_order", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "json_learning_pkg_value", name: "value_points", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "json_learning_pkg_content", name: "included_content", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "json_learning_pkg_faq", name: "faq", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_learning_pkg_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_pkg_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnpkg000000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_learning_packages_slug ON learning_packages (slug)",
    ],
    listRule: null,
    name: "learning_packages",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: null,
  });

  saveCollection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_module_id",
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
      { hidden: false, id: "text_learning_module_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_module_slug", name: "slug", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_module_title", name: "title", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_module_desc", name: "description", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_module_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["draft", "published"],
      },
      { hidden: false, id: "bool_learning_module_preview", name: "is_preview", required: false, system: false, type: "bool" },
      { hidden: false, id: "number_learning_module_position", name: "position", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "autodate_learning_module_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_module_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnmod000000001",
    indexes: [],
    listRule: null,
    name: "learning_modules",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: null,
  });

  saveCollection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_lesson_id",
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
      { hidden: false, id: "text_learning_lesson_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_lesson_module", name: "module_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_lesson_slug", name: "slug", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_lesson_title", name: "title", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_lesson_desc", name: "description", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_lesson_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["draft", "published"],
      },
      {
        hidden: false,
        id: "select_learning_lesson_type",
        name: "content_type",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["video", "material", "mixed"],
      },
      { hidden: false, id: "text_learning_lesson_video", name: "video_url", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_lesson_material", name: "material_url", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "json_learning_lesson_attach", name: "attachments", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "bool_learning_lesson_preview", name: "is_preview", required: false, system: false, type: "bool" },
      { hidden: false, id: "number_learning_lesson_position", name: "position", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_learning_lesson_minutes", name: "estimated_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "autodate_learning_lesson_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_lesson_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnles000000001",
    indexes: [],
    listRule: null,
    name: "learning_lessons",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: null,
  });

  saveCollection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_sub_id",
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
      { hidden: false, id: "text_learning_sub_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_customer", name: "stripe_customer_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_subscription", name: "stripe_subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_session", name: "stripe_checkout_session_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_sub_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"],
      },
      { hidden: false, id: "bool_learning_sub_cancel_end", name: "cancel_at_period_end", required: false, system: false, type: "bool" },
      { hidden: false, id: "text_learning_sub_start", name: "current_period_start", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_end", name: "current_period_end", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_cancelled", name: "canceled_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "number_learning_sub_price", name: "price_amount", required: false, system: false, type: "number", max: null, min: 0, onlyInt: false },
      { hidden: false, id: "text_learning_sub_currency", name: "currency", required: false, system: false, type: "text", autogeneratePattern: "", max: 10, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_interval", name: "billing_interval", required: false, system: false, type: "text", autogeneratePattern: "", max: 50, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_sub_access", name: "access_ends_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "autodate_learning_sub_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_sub_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnsub000000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_learning_subscriptions_stripe_subscription ON learning_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id != ''",
    ],
    listRule: null,
    name: "learning_subscriptions",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: null,
  });

  saveCollection({
    createRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_progress_id",
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
      { hidden: false, id: "text_learning_progress_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_progress_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_progress_module", name: "module_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_progress_lesson", name: "lesson_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      {
        hidden: false,
        id: "select_learning_progress_status",
        name: "status",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["not_started", "in_progress", "completed"],
      },
      { hidden: false, id: "number_learning_progress_pct", name: "progress_percentage", required: false, system: false, type: "number", max: 100, min: 0, onlyInt: true },
      { hidden: false, id: "text_learning_progress_opened", name: "last_opened_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_learning_progress_completed", name: "completed_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "autodate_learning_progress_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_progress_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnprg000000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_learning_progress_unique_lesson ON learning_progress (user_id, lesson_id)",
    ],
    listRule: "@request.auth.id = user_id || @request.auth.is_admin = true",
    name: "learning_progress",
    system: false,
    type: "base",
    updateRule: "@request.auth.id = user_id || @request.auth.is_admin = true",
    viewRule: "@request.auth.id = user_id || @request.auth.is_admin = true",
  });

  let packageRecord = null;

  try {
    packageRecord = app.findFirstRecordByData("learning_packages", "slug", "zahni-masterclass");
  } catch {
    packageRecord = null;
  }

  if (!packageRecord) {
    const packageCollection = app.findCollectionByNameOrId("learning_packages");
    packageRecord = new Record(packageCollection);
    packageRecord.set("slug", "zahni-masterclass");
    packageRecord.set("title", "Zahni Masterclass");
    packageRecord.set("subtitle", "A premium study package for students who want a structured path through practical dental training.");
    packageRecord.set("description", "Built for launch with one package, but structured for future package expansion. This package combines guided video explanations, concise study materials, and lesson-based progression in one recurring membership.");
    packageRecord.set("target_audience", "Dental students preparing for practical modules, simulation lab work, and exam phases who want one clear learning workflow.");
    packageRecord.set("hero_image_url", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1600&q=80");
    packageRecord.set("thumbnail_url", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=900&q=80");
    packageRecord.set("price_amount", 39);
    packageRecord.set("currency", "EUR");
    packageRecord.set("billing_interval", "month");
    packageRecord.set("billing_interval_count", 1);
    packageRecord.set("status", "published");
    packageRecord.set("sort_order", 1);
    packageRecord.set("value_points", [
      "Structured curriculum with clear progression",
      "Premium study materials and practical guidance",
      "Recurring access with managed billing and cancellation",
    ]);
    packageRecord.set("included_content", [
      "Guided modules with clear lesson order",
      "Video and downloadable material mix",
      "Progress-aware dashboard and subscription access",
    ]);
    packageRecord.set("faq", [
      {
        question: "How many packages are available at launch?",
        answer: "Version one launches with one package, while the data model already supports more packages later.",
      },
      {
        question: "How is billing handled?",
        answer: "Subscriptions renew automatically and are synchronized from Stripe into platform access records.",
      },
    ]);
    app.save(packageRecord);
  }

  const ensureModule = ({ slug, title, description, position, isPreview }) => {
    let moduleRecord = null;

    try {
      moduleRecord = app.findFirstRecordByData("learning_modules", "slug", slug);
    } catch {
      moduleRecord = null;
    }

    if (!moduleRecord) {
      const moduleCollection = app.findCollectionByNameOrId("learning_modules");
      moduleRecord = new Record(moduleCollection);
      moduleRecord.set("package_id", packageRecord.id);
      moduleRecord.set("slug", slug);
      moduleRecord.set("title", title);
      moduleRecord.set("description", description);
      moduleRecord.set("status", "published");
      moduleRecord.set("position", position);
      moduleRecord.set("is_preview", isPreview === true);
      app.save(moduleRecord);
    }

    return moduleRecord;
  };

  const foundationModule = ensureModule({
    slug: "zahni-foundations",
    title: "Foundations and Workflow",
    description: "A guided entry into the package with platform orientation, study rhythm, and the first clinical workflow concepts.",
    position: 1,
    isPreview: true,
  });

  const practicalModule = ensureModule({
    slug: "zahni-practical-systems",
    title: "Practical Systems",
    description: "Focused lessons for practical preparation with material references, demonstrations, and repeatable routines.",
    position: 2,
    isPreview: false,
  });

  const ensureLesson = ({ moduleRecord, slug, title, description, position, isPreview, contentType, estimatedMinutes, videoUrl, materialUrl, attachments }) => {
    let lessonRecord = null;

    try {
      lessonRecord = app.findFirstRecordByData("learning_lessons", "slug", slug);
    } catch {
      lessonRecord = null;
    }

    if (!lessonRecord) {
      const lessonCollection = app.findCollectionByNameOrId("learning_lessons");
      lessonRecord = new Record(lessonCollection);
      lessonRecord.set("package_id", packageRecord.id);
      lessonRecord.set("module_id", moduleRecord.id);
      lessonRecord.set("slug", slug);
      lessonRecord.set("title", title);
      lessonRecord.set("description", description);
      lessonRecord.set("status", "published");
      lessonRecord.set("content_type", contentType);
      lessonRecord.set("position", position);
      lessonRecord.set("is_preview", isPreview === true);
      lessonRecord.set("estimated_minutes", estimatedMinutes);
      lessonRecord.set("video_url", videoUrl || "");
      lessonRecord.set("material_url", materialUrl || "");
      lessonRecord.set("attachments", attachments || []);
      app.save(lessonRecord);
    }
  };

  ensureLesson({
    moduleRecord: foundationModule,
    slug: "welcome-and-study-plan",
    title: "Welcome and study plan",
    description: "Start with the platform flow, package structure, and how to use the lessons during your semester.",
    position: 1,
    isPreview: true,
    contentType: "mixed",
    estimatedMinutes: 14,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    materialUrl: "https://example.com/materials/study-plan.pdf",
    attachments: [
      { label: "Study planner PDF", url: "https://example.com/materials/study-plan.pdf" },
    ],
  });

  ensureLesson({
    moduleRecord: foundationModule,
    slug: "instrument-setup-basics",
    title: "Instrument setup basics",
    description: "A concise walkthrough of preparing your setup, avoiding friction, and building repeatable practical habits.",
    position: 2,
    isPreview: true,
    contentType: "video",
    estimatedMinutes: 18,
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    attachments: [],
  });

  ensureLesson({
    moduleRecord: practicalModule,
    slug: "preclinical-routine-system",
    title: "Preclinical routine system",
    description: "Break down the sequence for a cleaner, more reliable practical workflow.",
    position: 1,
    isPreview: false,
    contentType: "mixed",
    estimatedMinutes: 24,
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    materialUrl: "https://example.com/materials/preclinical-routine.pdf",
    attachments: [
      { label: "Routine checklist", url: "https://example.com/materials/preclinical-routine.pdf" },
    ],
  });

  ensureLesson({
    moduleRecord: practicalModule,
    slug: "exam-week-prep",
    title: "Exam week preparation",
    description: "Turn the package into an exam-phase system with prioritization, repetition, and calmer execution.",
    position: 2,
    isPreview: false,
    contentType: "material",
    estimatedMinutes: 16,
    materialUrl: "https://example.com/materials/exam-week-prep.pdf",
    attachments: [
      { label: "Exam week worksheet", url: "https://example.com/materials/exam-week-prep.pdf" },
    ],
  });
}, (app) => {
  const collectionNames = [
    "learning_progress",
    "learning_subscriptions",
    "learning_lessons",
    "learning_modules",
    "learning_packages",
  ];

  for (const collectionName of collectionNames) {
    try {
      const collection = app.findCollectionByNameOrId(collectionName);
      app.delete(collection);
    } catch (error) {
      if (error.message.includes("no rows in result set")) {
        console.log(`Collection ${collectionName} not found, skipping rollback`);
        continue;
      }

      throw error;
    }
  }
})
