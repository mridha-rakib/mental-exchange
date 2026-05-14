/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const updateRules = (collectionName, rules) => {
    try {
      const collection = app.findCollectionByNameOrId(collectionName);
      Object.assign(collection, rules);
      app.save(collection);
    } catch (error) {
      if (!error.message.includes("no rows in result set")) {
        throw error;
      }
    }
  };

  updateRules("learning_lessons", {
    createRule: "@request.auth.is_admin = true",
    listRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true",
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });

  updateRules("learning_modules", {
    createRule: "@request.auth.is_admin = true",
    listRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true",
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });

  updateRules("learning_subscriptions", {
    createRule: "@request.auth.is_admin = true",
    listRule: "@request.auth.is_admin = true || @request.auth.id = user_id",
    viewRule: "@request.auth.is_admin = true || @request.auth.id = user_id",
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });

  updateRules("learning_media", {
    createRule: "@request.auth.is_admin = true",
    listRule: "@request.auth.is_admin = true",
    viewRule: "@request.auth.is_admin = true || media_type = \"image\"",
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });
}, (app) => {
  const updateRules = (collectionName, rules) => {
    try {
      const collection = app.findCollectionByNameOrId(collectionName);
      Object.assign(collection, rules);
      app.save(collection);
    } catch (error) {
      if (!error.message.includes("no rows in result set")) {
        throw error;
      }
    }
  };

  updateRules("learning_lessons", {
    createRule: "@request.auth.is_admin = true",
    listRule: null,
    viewRule: null,
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });

  updateRules("learning_modules", {
    createRule: "@request.auth.is_admin = true",
    listRule: null,
    viewRule: null,
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });

  updateRules("learning_subscriptions", {
    createRule: "@request.auth.id != ''",
    listRule: null,
    viewRule: null,
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });

  updateRules("learning_media", {
    createRule: "@request.auth.is_admin = true",
    listRule: "@request.auth.is_admin = true",
    viewRule: "",
    updateRule: "@request.auth.is_admin = true",
    deleteRule: "@request.auth.is_admin = true",
  });
});
