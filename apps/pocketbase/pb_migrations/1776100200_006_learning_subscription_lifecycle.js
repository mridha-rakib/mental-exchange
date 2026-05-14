/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const subscriptions = app.findCollectionByNameOrId("learning_subscriptions");
  const statusField = subscriptions.fields.getByName("status");
  const graceEndsAt = subscriptions.fields.getByName("grace_ends_at");
  const lastPaymentFailedAt = subscriptions.fields.getByName("last_payment_failed_at");

  if (statusField) {
    statusField.values = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused", "expired"];
  }

  if (!graceEndsAt) {
    subscriptions.fields.add(new TextField({
      name: "grace_ends_at",
      required: false,
    }));
  }

  if (!lastPaymentFailedAt) {
    subscriptions.fields.add(new TextField({
      name: "last_payment_failed_at",
      required: false,
    }));
  }

  app.save(subscriptions);
}, (app) => {
  const subscriptions = app.findCollectionByNameOrId("learning_subscriptions");
  const statusField = subscriptions.fields.getByName("status");

  if (statusField) {
    statusField.values = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"];
  }

  if (subscriptions.fields.getByName("grace_ends_at")) {
    subscriptions.fields.removeByName("grace_ends_at");
  }

  if (subscriptions.fields.getByName("last_payment_failed_at")) {
    subscriptions.fields.removeByName("last_payment_failed_at");
  }

  app.save(subscriptions);
})
