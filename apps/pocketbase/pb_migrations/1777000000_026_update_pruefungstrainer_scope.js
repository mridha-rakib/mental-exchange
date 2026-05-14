/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let packageRecord = null;

  try {
    packageRecord = app.findFirstRecordByData("learning_packages", "slug", "z3-pruefungstrainer");
  } catch {
    packageRecord = null;
  }

  if (!packageRecord) {
    return;
  }

  packageRecord.set("subtitle", "Für intensive Wiederholung");
  packageRecord.set("description", "Das vollständige Z3 Paket mit Struktur-Funktionen, vertiefenden High-Yield-Lernseiten, priorisierten Wiederholungsthemen und prüfungsnaher Inhaltsstruktur.");
  packageRecord.set("hero_copy", "Intensiv wiederholen mit High-Yield-Seiten, Priorisierung und klarer Inhaltsstruktur.");
  packageRecord.set("target_audience", "Studierende, die neben Lernplan und Inhalt eine intensivere Wiederholungsstruktur brauchen.");
  packageRecord.set("value_points", [
    "Alles aus Z3 Struktur",
    "Priorisierte Wiederholungsthemen",
    "Vertiefende High-Yield-Lernseiten",
    "Wiederholungsübersicht",
    "Prüfungsnahe Inhaltsstruktur",
  ]);
  packageRecord.set("included_content", [
    "Alle Z3 Struktur Funktionen",
    "Vertiefte High-Yield-Lernseiten",
    "Priorisierte Wiederholungslisten",
    "Prüfungsnahe Inhaltsübersicht",
  ]);
  packageRecord.set("faq", [
    {
      question: "Was ergänzt der Prüfungstrainer?",
      answer: "Er ergänzt den Lernplan um vertiefende Lernseiten, priorisierte Wiederholung und eine klarere Inhaltsübersicht.",
    },
  ]);
  packageRecord.set("seo_description", "Z3 Prüfungstrainer bietet Z3 Inhalte, Lernplan, vertiefende Lernseiten und priorisierte Wiederholung.");

  app.save(packageRecord);
}, () => {
  // Scope reduction is intentional and should not be reverted automatically.
});

