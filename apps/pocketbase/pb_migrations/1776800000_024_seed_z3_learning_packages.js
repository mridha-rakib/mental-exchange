/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const packageCollection = app.findCollectionByNameOrId("learning_packages");

  const packageSeeds = [
    {
      slug: "z3-start",
      title: "Z3 Start",
      subtitle: "Für selbstständiges Lernen",
      description: "Der Einstieg in die Z3 Vorbereitung mit vollständigem Zugriff auf die Lerninhalte, klar sortierten Themen, Zusammenfassungen und High-Yield-Markierungen.",
      hero_copy: "Selbstständig lernen mit allen Z3 Inhalten, Fachgebietsstruktur und kompakten Merkhilfen.",
      target_audience: "Studierende, die selbstständig lernen und alle Z3 Inhalte strukturiert öffnen möchten.",
      price_amount: 19,
      yearly_price_amount: 89,
      currency: "EUR",
      billing_interval: "month",
      billing_interval_count: 1,
      status: "published",
      sort_order: 10,
      pricing_copy: "19 EUR pro Monat oder 89 EUR bis zur Prüfung",
      cta_text: "Z3 Start wählen",
      value_points: [
        "Zugriff auf alle Lerninhalte",
        "Themen nach Fachgebieten sortiert",
        "Zusammenfassungen & Merksätze",
        "High-Yield-Markierungen",
      ],
      included_content: [
        "Alle Z3 Lernseiten",
        "Topic- und Subtopic-Struktur",
        "Direkte Inhaltslinks",
        "Suchfähige Lerninhalte",
      ],
      faq: [
        {
          question: "Für wen ist Z3 Start geeignet?",
          answer: "Für Studierende, die die Z3 Inhalte vollständig nutzen und ihren Lernrhythmus selbst steuern möchten.",
        },
      ],
      promo_badge: "",
      promo_text: "",
      seo_title: "Z3 Start Lernpaket - Zahnibörse",
      seo_description: "Z3 Start bietet Zugriff auf alle Z3 Lerninhalte für selbstständige Prüfungsvorbereitung.",
    },
    {
      slug: "z3-struktur",
      title: "Z3 Struktur",
      subtitle: "Mit individuellem Lernplan",
      description: "Das strukturierte Z3 Paket mit allen Start-Inhalten, personalisiertem Lernplan, Tages- und Wochenzielen, Wiederholungen, Puffertagen und Fortschrittsanzeige.",
      hero_copy: "Z3 Vorbereitung mit Lernplan, klaren Wochenzielen und nachvollziehbarem Fortschritt.",
      target_audience: "Studierende, die neben vollständigem Lernzugang eine klare Lernstruktur und regelmäßiges Feedback brauchen.",
      price_amount: 39,
      yearly_price_amount: 169,
      currency: "EUR",
      billing_interval: "month",
      billing_interval_count: 1,
      status: "published",
      sort_order: 20,
      pricing_copy: "39 EUR pro Monat oder 169 EUR bis zur Prüfung",
      cta_text: "Z3 Struktur wählen",
      value_points: [
        "Alles aus Z3 Start",
        "Personalisierter Lernplan",
        "Tages- und Wochenziele",
        "Wiederholungs- & Puffer-Tage",
        "Fortschrittsanzeige",
      ],
      included_content: [
        "Alle Z3 Start Inhalte",
        "Lernplan-Dashboard",
        "Daily und Weekly Goals",
        "Fortschritts- und Feedback-Ansichten",
      ],
      faq: [
        {
          question: "Warum ist Z3 Struktur beliebt?",
          answer: "Es kombiniert vollständigen Lernzugang mit einem konkreten Plan, damit offene Themen und Wochenziele sichtbar bleiben.",
        },
      ],
      promo_badge: "Beliebt",
      promo_text: "Der empfohlene Plan für Studierende, die nicht nur Inhalte, sondern einen realistischen Lernrhythmus brauchen.",
      seo_title: "Z3 Struktur Lernpaket - Zahnibörse",
      seo_description: "Z3 Struktur ergänzt alle Z3 Inhalte um Lernplan, Ziele, Fortschritt und Feedback.",
    },
    {
      slug: "z3-pruefungstrainer",
      title: "Z3 Prüfungstrainer",
      subtitle: "Für intensive Wiederholung",
      description: "Das vollständige Z3 Paket mit Struktur-Funktionen, vertiefenden High-Yield-Lernseiten, priorisierten Wiederholungsthemen und prüfungsnaher Inhaltsstruktur.",
      hero_copy: "Intensiv wiederholen mit High-Yield-Seiten, Priorisierung und klarer Inhaltsstruktur.",
      target_audience: "Studierende, die neben Lernplan und Inhalt eine intensivere Wiederholungsstruktur brauchen.",
      price_amount: 59,
      yearly_price_amount: 299,
      currency: "EUR",
      billing_interval: "month",
      billing_interval_count: 1,
      status: "published",
      sort_order: 30,
      pricing_copy: "59 EUR pro Monat oder 299 EUR bis zur Prüfung",
      cta_text: "Prüfungstrainer wählen",
      value_points: [
        "Alles aus Z3 Struktur",
        "Priorisierte Wiederholungsthemen",
        "Vertiefende High-Yield-Lernseiten",
        "Wiederholungsübersicht",
        "Prüfungsnahe Inhaltsstruktur",
      ],
      included_content: [
        "Alle Z3 Struktur Funktionen",
        "Vertiefte High-Yield-Lernseiten",
        "Priorisierte Wiederholungslisten",
        "Prüfungsnahe Inhaltsübersicht",
      ],
      faq: [
        {
          question: "Was ergänzt der Prüfungstrainer?",
          answer: "Er ergänzt den Lernplan um vertiefende Lernseiten, priorisierte Wiederholung und eine klarere Inhaltsübersicht.",
        },
      ],
      promo_badge: "",
      promo_text: "",
      seo_title: "Z3 Prüfungstrainer Lernpaket - Zahnibörse",
      seo_description: "Z3 Prüfungstrainer bietet Z3 Inhalte, Lernplan, vertiefende Lernseiten und priorisierte Wiederholung.",
    },
  ];

  const setPackageFields = (record, seed) => {
    for (const [fieldName, value] of Object.entries(seed)) {
      record.set(fieldName, value);
    }

    record.set("coupons_enabled", false);
  };

  for (const seed of packageSeeds) {
    let record = null;

    try {
      record = app.findFirstRecordByData("learning_packages", "slug", seed.slug);
    } catch {
      record = null;
    }

    if (!record) {
      record = new Record(packageCollection);
    }

    setPackageFields(record, seed);
    app.save(record);
  }
}, (app) => {
  for (const slug of ["z3-start", "z3-struktur", "z3-pruefungstrainer"]) {
    try {
      const record = app.findFirstRecordByData("learning_packages", "slug", slug);
      if (record) {
        record.set("status", "archived");
        app.save(record);
      }
    } catch {
      console.log(`Z3 learning package ${slug} not found, skipping rollback archive`);
    }
  }
})
