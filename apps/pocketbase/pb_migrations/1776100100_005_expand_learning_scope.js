/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");
  const yearlyPriceAmount = packages.fields.getByName("yearly_price_amount");
  const yearlyStripePriceId = packages.fields.getByName("yearly_stripe_price_id");

  if (!yearlyPriceAmount) {
    packages.fields.add(new NumberField({
      name: "yearly_price_amount",
      required: false,
      min: 0,
    }));
  }

  if (!yearlyStripePriceId) {
    packages.fields.add(new TextField({
      name: "yearly_stripe_price_id",
      required: false,
    }));
  }

  app.save(packages);

  const lessons = app.findCollectionByNameOrId("learning_lessons");
  const contentType = lessons.fields.getByName("content_type");
  const textContent = lessons.fields.getByName("text_content");
  const pdfUrl = lessons.fields.getByName("pdf_url");
  const downloadUrl = lessons.fields.getByName("download_url");

  if (contentType) {
    contentType.values = ["video", "text", "pdf", "download", "mixed"];
  }

  if (!textContent) {
    lessons.fields.add(new TextField({
      name: "text_content",
      required: false,
    }));
  }

  if (!pdfUrl) {
    lessons.fields.add(new TextField({
      name: "pdf_url",
      required: false,
    }));
  }

  if (!downloadUrl) {
    lessons.fields.add(new TextField({
      name: "download_url",
      required: false,
    }));
  }

  app.save(lessons);

  try {
    const packageRecord = app.findFirstRecordByData("learning_packages", "slug", "zahni-masterclass");
    if (packageRecord && !packageRecord.get("yearly_price_amount")) {
      packageRecord.set("yearly_price_amount", 390);
      app.save(packageRecord);
    }
  } catch {
    console.log("Default learning package not found, skipping yearly price seed");
  }

  const ensureLessonFieldValues = (slug, values) => {
    try {
      const lesson = app.findFirstRecordByData("learning_lessons", "slug", slug);
      if (!lesson) return;

      for (const [fieldName, fieldValue] of Object.entries(values)) {
        if (!lesson.get(fieldName)) {
          lesson.set(fieldName, fieldValue);
        }
      }

      app.save(lesson);
    } catch {
      console.log(`Learning lesson ${slug} not found, skipping seed update`);
    }
  };

  ensureLessonFieldValues("welcome-and-study-plan", {
    content_type: "mixed",
    text_content: "Use this opening lesson to understand the package structure, set a weekly rhythm, and decide how you want to combine video explanations with your own practical repetition blocks.",
    pdf_url: "https://example.com/materials/study-plan.pdf",
    download_url: "https://example.com/materials/study-plan.pdf",
  });

  ensureLessonFieldValues("instrument-setup-basics", {
    content_type: "video",
    text_content: "This lesson focuses on setup logic, how to reduce friction before practice starts, and how to document your own repeatable workflow.",
  });

  ensureLessonFieldValues("preclinical-routine-system", {
    content_type: "mixed",
    text_content: "Break the practical routine into repeatable stages. Review the material, watch the demonstration, and then repeat the sequence with your own timing notes.",
    pdf_url: "https://example.com/materials/preclinical-routine.pdf",
    download_url: "https://example.com/materials/preclinical-routine.pdf",
  });

  ensureLessonFieldValues("exam-week-prep", {
    content_type: "pdf",
    text_content: "Use the worksheet to structure exam week preparation, identify high-risk gaps, and build a focused repetition plan.",
    pdf_url: "https://example.com/materials/exam-week-prep.pdf",
    download_url: "https://example.com/materials/exam-week-prep.pdf",
  });
}, (app) => {
  const packages = app.findCollectionByNameOrId("learning_packages");
  if (packages.fields.getByName("yearly_price_amount")) {
    packages.fields.removeByName("yearly_price_amount");
  }
  if (packages.fields.getByName("yearly_stripe_price_id")) {
    packages.fields.removeByName("yearly_stripe_price_id");
  }
  app.save(packages);

  const lessons = app.findCollectionByNameOrId("learning_lessons");
  const contentType = lessons.fields.getByName("content_type");
  if (contentType) {
    contentType.values = ["video", "material", "mixed"];
  }
  if (lessons.fields.getByName("text_content")) {
    lessons.fields.removeByName("text_content");
  }
  if (lessons.fields.getByName("pdf_url")) {
    lessons.fields.removeByName("pdf_url");
  }
  if (lessons.fields.getByName("download_url")) {
    lessons.fields.removeByName("download_url");
  }
  app.save(lessons);
})
