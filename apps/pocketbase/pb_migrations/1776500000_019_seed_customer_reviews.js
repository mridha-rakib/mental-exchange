/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("customer_reviews");
  const seeds = [
    {
      id: "reviewseed00001",
      user_id: "seed_user_laura",
      order_id: "seed_order_review_1",
      product_id: "seed_product_review_1",
      product_name: "Marketplace instruments",
      product_type: "marketplace",
      rating: 5,
      body: "Great platform. I found all the instruments I needed for my phantom course here. Everything was in top condition and much cheaper than buying new.",
      display_name: "Laura M.",
    },
    {
      id: "reviewseed00002",
      user_id: "seed_user_schmidt",
      order_id: "seed_order_review_2",
      product_id: "seed_product_review_2",
      product_name: "Seller tools",
      product_type: "marketplace",
      rating: 5,
      body: "As a dentist, I regularly sell instruments here that I no longer need. The process is secure and straightforward.",
      display_name: "Dr. Schmidt",
    },
    {
      id: "reviewseed00003",
      user_id: "seed_user_julian",
      order_id: "seed_order_review_3",
      product_id: "seed_product_review_3",
      product_name: "Shop order",
      product_type: "shop",
      rating: 4,
      body: "A strong idea from students for students. Shipping was very fast and customer support responded immediately to my question.",
      display_name: "Julian K.",
    },
  ];

  for (const seed of seeds) {
    try {
      app.findFirstRecordByData("customer_reviews", "order_id", seed.order_id);
      continue;
    } catch {
      // Record does not exist yet.
    }

    const record = new Record(collection);
    record.set("id", seed.id);
    record.set("user_id", seed.user_id);
    record.set("order_id", seed.order_id);
    record.set("product_id", seed.product_id);
    record.set("product_name", seed.product_name);
    record.set("product_type", seed.product_type);
    record.set("rating", seed.rating);
    record.set("body", seed.body);
    record.set("display_name", seed.display_name);
    record.set("status", "approved");
    record.set("is_featured", true);
    record.set("admin_notes", "Seeded homepage review.");
    app.save(record);
  }
}, (app) => {
  const ids = ["reviewseed00001", "reviewseed00002", "reviewseed00003"];

  for (const id of ids) {
    try {
      const record = app.findRecordById("customer_reviews", id);
      app.delete(record);
    } catch {
      // Already removed.
    }
  }
});
