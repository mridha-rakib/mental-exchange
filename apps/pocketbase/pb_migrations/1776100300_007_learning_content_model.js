/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const modules = app.findCollectionByNameOrId("learning_modules");
  const estimatedDuration = modules.fields.getByName("estimated_duration_minutes");

  if (!estimatedDuration) {
    modules.fields.add(new NumberField({
      name: "estimated_duration_minutes",
      required: false,
      min: 0,
      onlyInt: true,
    }));
    app.save(modules);
  }

  const moduleRecords = app.findRecordsByFilter("learning_modules", "", "position,title");
  for (const moduleRecord of moduleRecords) {
    const currentValue = Number(moduleRecord.get("estimated_duration_minutes") || 0);
    if (currentValue > 0) {
      continue;
    }

    const lessons = app.findRecordsByFilter(
      "learning_lessons",
      `module_id="${moduleRecord.id}"`,
      "position,title",
    );

    const totalMinutes = lessons.reduce((sum, lesson) => sum + Number(lesson.get("estimated_minutes") || 0), 0);
    if (totalMinutes > 0) {
      moduleRecord.set("estimated_duration_minutes", totalMinutes);
      app.save(moduleRecord);
    }
  }
}, (app) => {
  const modules = app.findCollectionByNameOrId("learning_modules");
  if (modules.fields.getByName("estimated_duration_minutes")) {
    modules.fields.removeByName("estimated_duration_minutes");
    app.save(modules);
  }
})
