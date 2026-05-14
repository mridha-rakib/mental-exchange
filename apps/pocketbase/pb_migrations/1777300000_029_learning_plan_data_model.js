/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const saveCollection = (config) => {
    const collection = new Collection(config);

    try {
      app.save(collection);
    } catch (error) {
      if (!error.message.includes("Collection name must be unique")) {
        throw error;
      }
    }
  };

  const ownerRule = "@request.auth.id = user_id || @request.auth.is_admin = true";

  saveCollection({
    createRule: ownerRule,
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_lrn_plan_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
      { hidden: false, id: "text_lrn_plan_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_plan_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_plan_subscription", name: "subscription_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_plan_tier", name: "tier_slug", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "select_lrn_plan_status", name: "status", required: true, system: false, type: "select", maxSelect: 1, values: ["draft", "active", "paused", "completed", "archived"] },
      { hidden: false, id: "text_lrn_plan_start", name: "start_date", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_plan_exam", name: "exam_date", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_plan_timezone", name: "timezone", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "json_lrn_plan_weekdays", name: "available_weekdays", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "number_lrn_plan_daily_min", name: "daily_goal_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_plan_weekly_topics", name: "weekly_goal_topics", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_plan_day_index", name: "current_day_index", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_lrn_plan_generated", name: "last_generated_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "select_lrn_plan_recalc", name: "recalculation_state", required: false, system: false, type: "select", maxSelect: 1, values: ["none", "minor_delay", "long_pause", "needs_review"] },
      { hidden: false, id: "text_lrn_plan_recalc_offer", name: "recalculation_offered_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_plan_recalc_at", name: "recalculated_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "json_lrn_plan_meta", name: "metadata", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_lrn_plan_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_lrn_plan_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnpln000000001",
    indexes: [
      "CREATE INDEX idx_learning_plans_user_status ON learning_plans (user_id, status, updated)",
      "CREATE INDEX idx_learning_plans_package ON learning_plans (package_id, status)",
    ],
    listRule: ownerRule,
    name: "learning_plans",
    system: false,
    type: "base",
    updateRule: ownerRule,
    viewRule: ownerRule,
  });

  saveCollection({
    createRule: ownerRule,
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_lrn_day_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
      { hidden: false, id: "text_lrn_day_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_day_plan", name: "plan_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_day_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_day_date", name: "day_date", required: true, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "number_lrn_day_index", name: "day_index", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "select_lrn_day_status", name: "status", required: true, system: false, type: "select", maxSelect: 1, values: ["planned", "in_progress", "completed", "missed", "skipped", "buffer"] },
      { hidden: false, id: "select_lrn_day_type", name: "day_type", required: false, system: false, type: "select", maxSelect: 1, values: ["study", "review", "buffer", "catch_up", "preparation"] },
      { hidden: false, id: "number_lrn_day_target_min", name: "target_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_day_done_min", name: "completed_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_day_assignments", name: "assignment_count", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_day_done_assign", name: "completed_assignment_count", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_lrn_day_feedback", name: "feedback_code", required: false, system: false, type: "text", autogeneratePattern: "", max: 120, min: 0, pattern: "" },
      { hidden: false, id: "json_lrn_day_meta", name: "metadata", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_lrn_day_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_lrn_day_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnpld000000001",
    indexes: [
      "CREATE UNIQUE INDEX idx_learning_plan_days_unique_date ON learning_plan_days (plan_id, day_date)",
      "CREATE INDEX idx_learning_plan_days_user_date ON learning_plan_days (user_id, day_date)",
    ],
    listRule: ownerRule,
    name: "learning_plan_days",
    system: false,
    type: "base",
    updateRule: ownerRule,
    viewRule: ownerRule,
  });

  saveCollection({
    createRule: ownerRule,
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_lrn_assign_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
      { hidden: false, id: "text_lrn_assign_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_plan", name: "plan_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_day", name: "plan_day_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_module", name: "module_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_lesson", name: "lesson_id", required: false, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "select_lrn_assign_type", name: "assignment_type", required: true, system: false, type: "select", maxSelect: 1, values: ["lesson", "topic", "review", "catch_up", "preparation"] },
      { hidden: false, id: "select_lrn_assign_status", name: "status", required: true, system: false, type: "select", maxSelect: 1, values: ["open", "started", "completed", "to_repeat", "overdue", "skipped"] },
      { hidden: false, id: "select_lrn_assign_priority", name: "priority", required: false, system: false, type: "select", maxSelect: 1, values: ["normal", "high", "urgent"] },
      { hidden: false, id: "text_lrn_assign_assigned", name: "assigned_date", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_due", name: "due_date", required: false, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_assign_done", name: "completed_at", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "number_lrn_assign_minutes", name: "estimated_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_assign_pos", name: "position", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_lrn_assign_source", name: "source", required: false, system: false, type: "text", autogeneratePattern: "", max: 80, min: 0, pattern: "" },
      { hidden: false, id: "json_lrn_assign_meta", name: "metadata", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_lrn_assign_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_lrn_assign_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnpla000000001",
    indexes: [
      "CREATE INDEX idx_learning_plan_assignments_day ON learning_plan_assignments (plan_day_id, position)",
      "CREATE INDEX idx_learning_plan_assignments_user_due ON learning_plan_assignments (user_id, status, due_date)",
    ],
    listRule: ownerRule,
    name: "learning_plan_assignments",
    system: false,
    type: "base",
    updateRule: ownerRule,
    viewRule: ownerRule,
  });

  saveCollection({
    createRule: ownerRule,
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_lrn_snap_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
      { hidden: false, id: "text_lrn_snap_user", name: "user_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_snap_plan", name: "plan_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_snap_package", name: "package_id", required: true, system: false, type: "text", autogeneratePattern: "", max: 0, min: 0, pattern: "" },
      { hidden: false, id: "text_lrn_snap_date", name: "snapshot_date", required: true, system: false, type: "text", autogeneratePattern: "", max: 40, min: 0, pattern: "" },
      { hidden: false, id: "select_lrn_snap_scope", name: "scope", required: true, system: false, type: "select", maxSelect: 1, values: ["daily", "weekly", "overall", "recalculation"] },
      { hidden: false, id: "number_lrn_snap_done_assign", name: "completed_assignments", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_snap_total_assign", name: "total_assignments", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_snap_done_min", name: "completed_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_snap_target_min", name: "target_minutes", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_snap_done_topics", name: "completed_topics", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_snap_total_topics", name: "total_topics", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "number_lrn_snap_behind", name: "behind_days", required: false, system: false, type: "number", max: null, min: 0, onlyInt: true },
      { hidden: false, id: "text_lrn_snap_feedback", name: "feedback_code", required: false, system: false, type: "text", autogeneratePattern: "", max: 120, min: 0, pattern: "" },
      { hidden: false, id: "json_lrn_snap_payload", name: "payload", required: false, system: false, type: "json", maxSize: 0 },
      { hidden: false, id: "autodate_lrn_snap_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_lrn_snap_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnpls000000001",
    indexes: [
      "CREATE INDEX idx_learning_plan_snapshots_plan_date ON learning_plan_snapshots (plan_id, snapshot_date, scope)",
    ],
    listRule: ownerRule,
    name: "learning_plan_snapshots",
    system: false,
    type: "base",
    updateRule: ownerRule,
    viewRule: ownerRule,
  });
}, (app) => {
  for (const name of [
    "learning_plan_snapshots",
    "learning_plan_assignments",
    "learning_plan_days",
    "learning_plans",
  ]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (error) {
      if (!error.message.includes("no rows in result set")) {
        throw error;
      }
    }
  }
})
