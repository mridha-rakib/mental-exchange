/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const ensureTextField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "text") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new TextField({
      name,
      required: false,
      autogeneratePattern: "",
      max: 0,
      min: 0,
      pattern: "",
    }));
    return true;
  };

  const ensureBoolField = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) {
      if (existing.type === "bool") return false;
      collection.fields.removeByName(name);
    }

    collection.fields.add(new BoolField({
      name,
      required: false,
    }));
    return true;
  };

  const users = app.findCollectionByNameOrId("users");
  let usersChanged = false;
  [
    "stripe_connect_account_id",
    "stripe_connect_onboarding_status",
    "stripe_connect_requirements_due",
    "stripe_connect_disabled_reason",
    "stripe_connect_last_synced_at",
  ].forEach((fieldName) => {
    usersChanged = ensureTextField(users, fieldName) || usersChanged;
  });
  usersChanged = ensureBoolField(users, "stripe_connect_charges_enabled") || usersChanged;
  usersChanged = ensureBoolField(users, "stripe_connect_payouts_enabled") || usersChanged;
  usersChanged = ensureBoolField(users, "stripe_connect_details_submitted") || usersChanged;
  if (usersChanged) {
    app.save(users);
  }

  const earnings = app.findCollectionByNameOrId("seller_earnings");
  const earningStatus = earnings.fields.getByName("status");
  if (earningStatus) {
    earningStatus.values = [
      "pending",
      "waiting_payout_release",
      "available",
      "confirmed",
      "blocked",
      "paid_out",
    ];
    app.save(earnings);
  }
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  let usersChanged = false;
  [
    "stripe_connect_account_id",
    "stripe_connect_onboarding_status",
    "stripe_connect_requirements_due",
    "stripe_connect_disabled_reason",
    "stripe_connect_last_synced_at",
    "stripe_connect_charges_enabled",
    "stripe_connect_payouts_enabled",
    "stripe_connect_details_submitted",
  ].forEach((fieldName) => {
    const existing = users.fields.getByName(fieldName);
    if (existing) {
      users.fields.removeByName(fieldName);
      usersChanged = true;
    }
  });
  if (usersChanged) {
    app.save(users);
  }
})
