/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    createRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_learning_media_id",
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
      {
        hidden: false,
        id: "text_learning_media_label",
        name: "label",
        required: false,
        system: false,
        type: "text",
        autogeneratePattern: "",
        max: 0,
        min: 0,
        pattern: "",
      },
      {
        hidden: false,
        id: "select_learning_media_type",
        name: "media_type",
        required: true,
        system: false,
        type: "select",
        maxSelect: 1,
        values: ["video", "pdf", "download", "image", "other"],
      },
      {
        hidden: false,
        id: "file_learning_media_file",
        name: "file",
        required: true,
        system: false,
        type: "file",
        maxSelect: 1,
        maxSize: 104857600,
        mimeTypes: [
          "video/mp4",
          "video/webm",
          "application/pdf",
          "application/zip",
          "application/octet-stream",
          "image/jpeg",
          "image/png",
          "image/webp",
        ],
        thumbs: [],
      },
      { hidden: false, id: "autodate_learning_media_created", name: "created", onCreate: true, onUpdate: false, presentable: false, system: false, type: "autodate" },
      { hidden: false, id: "autodate_learning_media_updated", name: "updated", onCreate: true, onUpdate: true, presentable: false, system: false, type: "autodate" },
    ],
    id: "lrnmed000000001",
    indexes: [
      "CREATE INDEX idx_learning_media_type ON learning_media (media_type, created)",
    ],
    listRule: "@request.auth.is_admin = true",
    name: "learning_media",
    system: false,
    type: "base",
    updateRule: "@request.auth.is_admin = true",
    viewRule: "",
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
    const collection = app.findCollectionByNameOrId("learning_media");
    app.delete(collection);
  } catch (error) {
    if (!error.message.includes("no rows in result set")) {
      throw error;
    }
  }
})
