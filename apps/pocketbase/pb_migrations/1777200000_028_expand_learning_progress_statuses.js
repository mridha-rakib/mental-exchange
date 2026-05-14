/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const progress = app.findCollectionByNameOrId("learning_progress");
  const status = progress.fields.getByName("status");

  if (status) {
    status.values = ["not_started", "in_progress", "completed", "to_repeat", "overdue"];
    app.save(progress);
  }
}, (app) => {
  const progress = app.findCollectionByNameOrId("learning_progress");
  const status = progress.fields.getByName("status");

  if (status) {
    const records = app.findRecordsByFilter(
      "learning_progress",
      'status="to_repeat" || status="overdue"',
      "",
      200,
      0,
    );

    for (const record of records) {
      record.set("status", "in_progress");
      app.save(record);
    }

    status.values = ["not_started", "in_progress", "completed"];
    app.save(progress);
  }
})
